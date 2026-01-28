// Single Page App for Training Content
class TrainingApp {
    constructor() {
        this.programs = null;
        this.currentProgram = null;
        this.manifest = null;
        this.modules = [];
        this.contentCache = new Map(); // Cache loaded pages
        this.currentPageIndex = 0;
        this.contentArea = document.getElementById('content-area');
        this.navMenu = document.getElementById('nav-menu');
        this.currentPageSpan = document.getElementById('current-page');
        this.totalPagesSpan = document.getElementById('total-pages');
        this.programSelect = document.getElementById('program-select');
        this.libraryTitle = document.getElementById('library-title');
        this.contentContainer = document.querySelector('.content');

        this.init();
    }

    async init() {
        try {
            await this.loadPrograms();
            this.renderProgramSelector();
            this.setupEventListeners();

            const hashState = this.getStateFromHash();
            const storedState = this.getStoredState();

            const defaultProgramId = this.programs?.programs?.[0]?.id || null;
            const programId = hashState.programId || storedState.programId || defaultProgramId;
            const pageIndex = Number.isInteger(hashState.pageIndex)
                ? hashState.pageIndex
                : (Number.isInteger(storedState.pageIndex) ? storedState.pageIndex : 0);

            if (programId) {
                await this.switchProgram(programId, pageIndex);
            }
        } catch (error) {
            this.showError('Failed to load training content. Please refresh the page.');
            console.error('Initialization error:', error);
        }
    }

    async loadPrograms() {
        try {
            const response = await fetch('programs.json');
            if (!response.ok) {
                throw new Error('Failed to fetch programs');
            }
            this.programs = await response.json();
            this.libraryTitle.textContent = this.programs.title;
        } catch (error) {
            console.error('Error loading programs:', error);
            throw error;
        }
    }

    renderProgramSelector() {
        this.programSelect.innerHTML = '';

        // Group programs by category
        const categories = {};
        this.programs.programs.forEach(program => {
            const category = program.category || 'Other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(program);
        });

        // Create optgroups for each category
        Object.keys(categories).sort().forEach(categoryName => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = categoryName;

            categories[categoryName].forEach(program => {
                const option = document.createElement('option');
                option.value = program.id;
                option.textContent = program.title;
                optgroup.appendChild(option);
            });

            this.programSelect.appendChild(optgroup);
        });
    }

    async switchProgram(programId, pageIndex = 0) {
        const program = this.programs.programs.find(p => p.id === programId);
        if (!program) return;

        this.currentProgram = program;
        this.programSelect.value = programId;

        // Update page title
        document.title = `${program.title} - Training`;

        // Load program manifest
        await this.loadManifest(program.manifest);
        this.renderNavigation();
        const safePageIndex = Math.min(
            Math.max(pageIndex, 0),
            Math.max(this.modules.length - 1, 0)
        );
        await this.loadPage(safePageIndex);
    }

    async loadManifest(manifestPath) {
        try {
            const response = await fetch(manifestPath);
            if (!response.ok) {
                throw new Error('Failed to fetch manifest');
            }
            this.manifest = await response.json();
            // Sort modules by order
            this.modules = this.manifest.modules.sort((a, b) => a.order - b.order);
            this.totalPagesSpan.textContent = this.modules.length;
        } catch (error) {
            console.error('Error loading manifest:', error);
            throw error;
        }
    }

    async loadPageContent(moduleIndex) {
        const module = this.modules[moduleIndex];
        const cacheKey = `${this.currentProgram.id}:${module.id}`;

        // Check cache first
        if (this.contentCache.has(cacheKey)) {
            return this.contentCache.get(cacheKey);
        }

        // Load from file (prepend program path)
        try {
            const programDir = this.currentProgram.manifest.replace('/manifest.json', '');
            const contentPath = `${programDir}/${module.file}`;
            const response = await fetch(contentPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${contentPath}`);
            }
            const content = await response.json();

            // Cache the content
            this.contentCache.set(cacheKey, content);
            return content;
        } catch (error) {
            console.error(`Error loading content for ${module.id}:`, error);
            throw error;
        }
    }

    renderNavigation() {
        this.navMenu.innerHTML = '';

        this.modules.forEach((module, index) => {
            const navItem = document.createElement('div');
            navItem.className = 'nav-item';
            navItem.innerHTML = `
                <span class="nav-item-number">${index + 1}</span>
                <span class="nav-item-title">${module.title}</span>
            `;
            navItem.addEventListener('click', () => this.loadPage(index));
            this.navMenu.appendChild(navItem);
        });
    }

    setupEventListeners() {
        // Program selector
        this.programSelect.addEventListener('change', (e) => {
            this.switchProgram(e.target.value);
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.navigatePrevious();
            } else if (e.key === 'ArrowRight') {
                this.navigateNext();
            }
        });
    }

    async loadPage(index) {
        if (index < 0 || index >= this.modules.length) {
            return;
        }

        this.currentPageIndex = index;

        // Show loading state
        this.contentArea.innerHTML = '<div class="loading">Loading content...</div>';

        try {
            // Load page content (with caching)
            const pageContent = await this.loadPageContent(index);

            // Render content
            this.contentArea.innerHTML = this.renderPageContent(pageContent);

            // Setup quiz event listeners if quiz exists
            this.setupQuizListeners();

            // Update navigation
            this.updateNavigation();

            // Update progress indicator
            this.currentPageSpan.textContent = index + 1;

            // Scroll to top of content container
            if (this.contentContainer) {
                this.contentContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // Update URL without page reload
            const hash = this.buildHash(this.currentProgram?.id, index);
            history.pushState({ programId: this.currentProgram?.id, page: index }, '', hash);
            this.storeState(this.currentProgram?.id, index);
        } catch (error) {
            this.showError('Failed to load page content. Please try again.');
            console.error('Error loading page:', error);
        }
    }

    renderPageContent(page) {
        let html = `<h1>${page.title}</h1>`;

        // Get program directory for resolving relative paths
        const programDir = this.currentProgram.manifest.replace('/manifest.json', '');

        page.sections.forEach(section => {
            if (section.type === 'heading') {
                html += `<h2>${section.content}</h2>`;
            } else if (section.type === 'subheading') {
                html += `<h3>${section.content}</h3>`;
            } else if (section.type === 'paragraph') {
                html += `<p>${this.parseMarkdown(section.content)}</p>`;
            } else if (section.type === 'list') {
                const listType = section.ordered ? 'ol' : 'ul';
                const items = section.items.map(item => `<li>${this.parseMarkdown(item)}</li>`).join('');
                html += `<${listType}>${items}</${listType}>`;
            } else if (section.type === 'code') {
                html += `<pre><code>${this.escapeHtml(section.content)}</code></pre>`;
            } else if (section.type === 'quote') {
                html += `<blockquote>${this.parseMarkdown(section.content)}</blockquote>`;
            } else if (section.type === 'image') {
                // Resolve image path relative to program directory
                const imageSrc = `${programDir}/${section.src}`;
                html += `<figure class="content-image">
                    <img src="${imageSrc}" alt="${section.alt || ''}" />
                    ${section.caption ? `<figcaption>${section.caption}</figcaption>` : ''}
                </figure>`;
            } else if (section.type === 'video') {
                html += `<div class="content-video">
                    <iframe
                        src="${section.url}"
                        title="${section.title || 'Video'}"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen>
                    </iframe>
                </div>`;
            } else if (section.type === 'quiz') {
                html += this.renderQuiz(section.questions);
            }
        });

        // Add inline navigation buttons at the bottom
        html += this.renderInlineNavigation();

        return html;
    }

    renderQuiz(questions) {
        let html = '<div class="quiz-container">';

        questions.forEach((q, qIndex) => {
            html += `
                <div class="quiz-question" data-question="${qIndex}">
                    <p class="quiz-question-text"><strong>Question ${qIndex + 1}:</strong> ${q.question}</p>
                    <div class="quiz-options">
            `;

            q.options.forEach((option, optIndex) => {
                html += `
                    <label class="quiz-option">
                        <input type="radio" name="question-${qIndex}" value="${optIndex}" />
                        <span class="quiz-option-text">${option}</span>
                        <span class="quiz-option-icon"></span>
                    </label>
                `;
            });

            html += `
                    </div>
                    <div class="quiz-feedback" data-explanation="${this.escapeHtml(q.explanation)}" data-correct="${q.correct}"></div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    renderInlineNavigation() {
        const hasPrevious = this.currentPageIndex > 0;
        const hasNext = this.currentPageIndex < this.modules.length - 1;

        if (!hasPrevious && !hasNext) {
            return ''; // No navigation needed if single page
        }

        let html = '<div class="inline-nav">';

        if (hasPrevious) {
            html += `
                <button class="inline-nav-btn prev-btn" onclick="window.trainingApp.navigatePrevious()">
                    <span>←</span> Previous
                </button>
            `;
        } else {
            html += '<div></div>'; // Empty div for spacing
        }

        if (hasNext) {
            html += `
                <button class="inline-nav-btn next-btn" onclick="window.trainingApp.navigateNext()">
                    Next <span>→</span>
                </button>
            `;
        }

        html += '</div>';
        return html;
    }

    parseMarkdown(text) {
        // Simple markdown parsing for inline elements
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupQuizListeners() {
        const quizOptions = this.contentArea.querySelectorAll('.quiz-option input');

        quizOptions.forEach(input => {
            input.addEventListener('change', (e) => {
                const questionDiv = e.target.closest('.quiz-question');
                const selectedValue = Number.parseInt(e.target.value);
                const feedback = questionDiv.querySelector('.quiz-feedback');
                const correctAnswer = Number.parseInt(feedback.dataset.correct);
                const explanation = feedback.dataset.explanation;

                // Remove previous feedback styling
                questionDiv.querySelectorAll('.quiz-option').forEach(opt => {
                    opt.classList.remove('correct', 'incorrect');
                });

                // Mark selected option
                const selectedOption = e.target.closest('.quiz-option');

                if (selectedValue === correctAnswer) {
                    selectedOption.classList.add('correct');
                    feedback.innerHTML = `<p class="feedback-correct">✓ Correct! ${explanation}</p>`;
                } else {
                    selectedOption.classList.add('incorrect');
                    // Also highlight the correct answer
                    const correctOption = questionDiv.querySelectorAll('.quiz-option')[correctAnswer];
                    correctOption.classList.add('correct');
                    feedback.innerHTML = `<p class="feedback-incorrect">✗ Incorrect. ${explanation}</p>`;
                }

                feedback.style.display = 'block';
            });
        });
    }

    updateNavigation() {
        // Update active state in sidebar
        const navItems = this.navMenu.querySelectorAll('.nav-item');
        navItems.forEach((item, index) => {
            if (index === this.currentPageIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    navigatePrevious() {
        if (this.currentPageIndex > 0) {
            this.loadPage(this.currentPageIndex - 1);
        }
    }

    navigateNext() {
        if (this.currentPageIndex < this.modules.length - 1) {
            this.loadPage(this.currentPageIndex + 1);
        }
    }

    showError(message) {
        this.contentArea.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem; color: #ef4444;">
                <h2>Error</h2>
                <p>${message}</p>
            </div>
        `;
    }

    getStateFromHash() {
        const hash = window.location.hash || '';
        const legacyMatch = hash.match(/#page-(\d+)/);
        if (legacyMatch) {
            return { programId: null, pageIndex: parseInt(legacyMatch[1], 10) - 1 };
        }

        if (!hash.startsWith('#')) {
            return { programId: null, pageIndex: null };
        }

        const params = new URLSearchParams(hash.slice(1));
        const programId = params.get('program');
        const pageParam = params.get('page');
        const pageIndex = pageParam ? parseInt(pageParam, 10) - 1 : null;

        return {
            programId: programId || null,
            pageIndex: Number.isInteger(pageIndex) ? pageIndex : null
        };
    }

    buildHash(programId, pageIndex) {
        const params = new URLSearchParams();
        if (programId) {
            params.set('program', programId);
        }
        if (Number.isInteger(pageIndex)) {
            params.set('page', pageIndex + 1);
        }
        return `#${params.toString()}`;
    }

    getStoredState() {
        try {
            const raw = localStorage.getItem('trainingAppState');
            if (!raw) {
                return { programId: null, pageIndex: null };
            }
            const data = JSON.parse(raw);
            return {
                programId: typeof data.programId === 'string' ? data.programId : null,
                pageIndex: Number.isInteger(data.pageIndex) ? data.pageIndex : null
            };
        } catch (error) {
            return { programId: null, pageIndex: null };
        }
    }

    storeState(programId, pageIndex) {
        try {
            localStorage.setItem('trainingAppState', JSON.stringify({
                programId: programId || null,
                pageIndex: Number.isInteger(pageIndex) ? pageIndex : 0
            }));
        } catch (error) {
            // Ignore storage failures (private mode, etc.)
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.trainingApp = new TrainingApp();

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (!window.trainingApp) return;

        if (e.state && typeof e.state.page === 'number' && e.state.programId) {
            if (window.trainingApp.currentProgram?.id !== e.state.programId) {
                window.trainingApp.switchProgram(e.state.programId, e.state.page);
                return;
            }
            window.trainingApp.loadPage(e.state.page);
            return;
        }

        const hashState = window.trainingApp.getStateFromHash();
        if (hashState.programId && window.trainingApp.currentProgram?.id !== hashState.programId) {
            window.trainingApp.switchProgram(hashState.programId, hashState.pageIndex ?? 0);
        } else if (Number.isInteger(hashState.pageIndex)) {
            window.trainingApp.loadPage(hashState.pageIndex);
        }
    });
});
