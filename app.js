document.addEventListener('DOMContentLoaded', () => {
    // ---ELEMENT REFERENCES---
    const setupArea = document.getElementById('setup-area');
    const setupInstruction = document.getElementById('setup-instruction');
    const scrollFade = document.getElementById('scroll-fade');
    const practiceArea = document.getElementById('practice-area');
    const descriptionDisplay = document.getElementById('description-display');
    const synonymsContainer = document.getElementById('synonyms-container');
    const inputRow = document.getElementById('input-row');
    const answerInput = document.getElementById('answer-input');
    const checkBtn = document.getElementById('check-btn');
    const tracingContainer = document.getElementById('tracing-container');
    const retryTraceBtn = document.getElementById('retry-trace-btn');
    const feedback = document.getElementById('feedback');
    const homeBtn = document.getElementById('home-btn');
    const flagBtn = document.getElementById('flag-btn');
    const nextBtn = document.getElementById('next-btn');
    const toast = document.getElementById('toast');

    // ---STATE VARIABLES---
    const GITHUB_URL = 'https://raw.githubusercontent.com/Ashonko/practice-spelling-for-IELTS/refs/heads/main/words.json';
    let allData = {};
    let currentPracticeList = [];
    let currentWordObject = null;
    let toastTimeout;
    let isTracingMode = false;
    let traceIndex = 0;

    // --- ICONS FOR CATEGORIES ---
    const categoryIcons = {
        'default': '📚',
        'flagged': '🚩',
        'all': '🎲',
        'days_of_the_week': '📅',
        'months_of_the_year': '🗓',
        'money_matters': '💰',
        'subjects': '🔬',
        'studying_at_college': '🎓',
        'marketing': '📈',
        'nature': '🌱',
        'health': '❤️‍🩹',
        'the_environment': '🌍',
        'the_animal_kingdom': '🐶',
        'plants': '🌻',
        'continents': '🗺',
        'countries': '🏞',
        'languages': '🗣',
        'homes': '🛋',
        'architecture_and_buildings': '🏰',
        'in_the_city': '🌇',
        'workplaces': '💼',
        'rating_and_qualities': '👌',
        'touring': '🏖',
        'verbs': '🏹',
        'adjectives': '🏆',
        'hobbies': '🎮',
        'sports': '⚽',
        'shapes': '🔷',
        'measurement': '📐',
        'transportations': '🚂',
        'vehicles': '🚌',
        'weather': '🌦',
        'places': '⛲',
        'equipment_and_tools': '⛑️',
        'the_arts_and_media': '🎭',
        'materials': '💍',
        'works_and_jobs': '🔬',
        'color': '🌈',
        'expressions_and_time': '⏳️',
        'other': '📔',
    };

    // ---FUNCTIONS---

    async function fetchData() {
        try {
            const response = await fetch(GITHUB_URL);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            allData = await response.json();
            renderCategoryCards();
            handleScrollFade(); // Calling this initially to set the state
        } catch (error) {
            setupArea.innerHTML = '<p>Error loading data. Please check your connection and try again.</p>';
            console.error('Fetch error:', error);
        }
    }

    // FUNCTION to manage the fade effect visibility
    function handleScrollFade() {
        const el = setupArea;
        // Checking if the content is scrollable at all
        const isScrollable = el.scrollHeight > el.clientHeight;
        
        if (!isScrollable) {
            scrollFade.style.opacity = '0';
            return;
        }
        
        // Checking if scrolled to the bottom
        const isScrolledToBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 1; // +1 for pixel precision

        if (isScrolledToBottom) {
            scrollFade.style.opacity = '0'; // Hiding fade at the bottom
        } else {
            scrollFade.style.opacity = '1'; // Showing fade otherwise
        }
    }

    function renderCategoryCards() {
        setupArea.innerHTML = '';

        const createCard = (category, title) => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.dataset.category = category;

            const icon = document.createElement('span');
            icon.className = 'card-icon';
            icon.textContent = categoryIcons[category] || categoryIcons['default'];

            const cardTitle = document.createElement('span');
            cardTitle.className = 'card-title';
            cardTitle.textContent = title;

            card.appendChild(icon);
            card.appendChild(cardTitle);

            card.addEventListener('click', () => startPractice(category));
            setupArea.appendChild(card);
        };

        if (getFlaggedWords().length > 0) {
            createCard('flagged', 'Practice Flagged');
        }

        createCard('all', 'All Categories');

        for (const category in allData) {
            const formattedTitle = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            createCard(category, formattedTitle);
        }
    }

    function startPractice(category) {
        if (category === 'all') {
            currentPracticeList = Object.values(allData).flat();
        } else if (category === 'flagged') {
            currentPracticeList = getFlaggedWords();
            if (currentPracticeList.length === 0) {
                showToast('You have no flagged words to practice!');
                return;
            }
        } else {
            currentPracticeList = allData[category];
        }
        if (!currentPracticeList || currentPracticeList.length === 0) {
            showToast('This category is empty.');
            return;
        }

        // Hiding home screen elements
        setupInstruction.classList.add('hidden'); 
        setupArea.classList.add('hidden');
        scrollFade.classList.add('hidden');

        // Showing practice screen
        practiceArea.classList.remove('hidden');

        displayNewQuestion();
    }

    function displayNewQuestion() {
        exitTracingMode();

        if (currentPracticeList.length === 1) {
            currentWordObject = currentPracticeList[0];
        } else {
            let nextWordObject;
            do {
                const randomIndex = Math.floor(Math.random() * currentPracticeList.length);
                nextWordObject = currentPracticeList[randomIndex];
            } while (currentPracticeList.length > 1 && nextWordObject === currentWordObject);
            currentWordObject = nextWordObject;
        }

        descriptionDisplay.textContent = currentWordObject.description;
        synonymsContainer.innerHTML = '';
        if (currentWordObject.synonyms && currentWordObject.synonyms.length > 0) {
            currentWordObject.synonyms.forEach(synonym => {
                const badge = document.createElement('span');
                badge.className = 'synonym-badge';
                badge.textContent = synonym;
                synonymsContainer.appendChild(badge);
            });
        }
        updateFlagButton();
        answerInput.value = '';
        answerInput.disabled = false;
        checkBtn.disabled = false;
        feedback.textContent = '';
        feedback.className = '';
        answerInput.focus();
    }

    function checkAnswer() {
        if (answerInput.value.trim() === '') return;
        const userAnswer = answerInput.value.trim().toLowerCase();
        const correctAnswer = currentWordObject.word.toLowerCase();
        if (userAnswer === correctAnswer) {
            feedback.textContent = 'Correct!';
            feedback.className = 'correct';
            answerInput.disabled = true;
            checkBtn.disabled = true;
        } else {
            feedback.textContent = 'Incorrect. Trace the correct spelling above.';
            feedback.className = 'incorrect';
            enterTracingMode();
        }
    }

    function enterTracingMode() {
        isTracingMode = true;
        traceIndex = 0;
        inputRow.classList.add('hidden');
        tracingContainer.classList.remove('hidden');
        retryTraceBtn.classList.remove('hidden');
        tracingContainer.innerHTML = '';
        const correctAnswer = currentWordObject.word;
        correctAnswer.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.className = 'trace-char';
            charSpan.textContent = char;
            tracingContainer.appendChild(charSpan);
        });
        tracingContainer.appendChild(retryTraceBtn);
        window.addEventListener('keydown', handleTraceTyping);
    }
    
    function resetTrace() {
        if (!isTracingMode) return;
        traceIndex = 0;
        const charSpans = tracingContainer.querySelectorAll('.trace-char');
        charSpans.forEach(span => {
            span.classList.remove('correct', 'incorrect');
        });
    }

    function handleTraceTyping(e) {
        if (!isTracingMode || traceIndex >= currentWordObject.word.length) return;
        if (e.key.length > 1 && e.key !== ' ' && e.key !== '-') return;
        e.preventDefault();
        const charSpans = tracingContainer.querySelectorAll('.trace-char');
        const expectedChar = charSpans[traceIndex].textContent;
        if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
            charSpans[traceIndex].classList.add('correct');
        } else {
            charSpans[traceIndex].classList.add('incorrect');
        }
        traceIndex++;
    }

    function exitTracingMode() {
        if (!isTracingMode) return;
        isTracingMode = false;
        tracingContainer.classList.add('hidden');
        retryTraceBtn.classList.add('hidden');
        inputRow.classList.remove('hidden');
        window.removeEventListener('keydown', handleTraceTyping);
    }
    
    function goToHome() {
        exitTracingMode();
        practiceArea.classList.add('hidden');

        // Showing home screen elements
        setupInstruction.classList.remove('hidden');
        setupArea.classList.remove('hidden');
        scrollFade.classList.remove('hidden');

        renderCategoryCards();
        handleScrollFade();
        currentWordObject = null;
    }

    function getFlaggedWords() {
        return JSON.parse(localStorage.getItem('flaggedWords')) || [];
    }

    function isWordFlagged(wordObj) {
        if (!wordObj) return false;
        const flaggedWords = getFlaggedWords();
        return flaggedWords.some(item => item.word === wordObj.word);
    }
    
    function updateFlagButton() {
        if (isWordFlagged(currentWordObject)) {
            flagBtn.textContent = '✅ Unflag Word';
            flagBtn.classList.add('flagged');
        } else {
            flagBtn.textContent = '🚩 Flag Word';
            flagBtn.classList.remove('flagged');
        }
    }

    function toggleFlag() {
        if (!currentWordObject) return;
        let flaggedWords = getFlaggedWords();
        if (isWordFlagged(currentWordObject)) {
            flaggedWords = flaggedWords.filter(item => item.word !== currentWordObject.word);
            showToast(`"${currentWordObject.word}" has been unflagged.`);
        } else {
            flaggedWords.push(currentWordObject);
            showToast(`"${currentWordObject.word}" has been flagged.`);
        }
        localStorage.setItem('flaggedWords', JSON.stringify(flaggedWords));
        updateFlagButton();
    }

    function showToast(message, duration = 2000) {
        clearTimeout(toastTimeout);
        toast.textContent = message;
        toast.classList.add('show');
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
    
    // --- EVENT LISTENERS ---
    setupArea.addEventListener('scroll', handleScrollFade);
    homeBtn.addEventListener('click', goToHome);
    checkBtn.addEventListener('click', checkAnswer);
    nextBtn.addEventListener('click', displayNewQuestion);
    flagBtn.addEventListener('click', toggleFlag);
    retryTraceBtn.addEventListener('click', resetTrace);
    
    answerInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && !answerInput.disabled) {
            checkAnswer();
        }
    });

    // ---INITIALIZE APP---
    fetchData();
});