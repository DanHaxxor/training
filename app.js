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
        this.progressIndicator = document.querySelector('.progress-indicator');
        this.currentPageSpan = document.getElementById('current-page');
        this.totalPagesSpan = document.getElementById('total-pages');
        this.libraryTitle = document.getElementById('library-title');
        this.contentContainer = document.querySelector('.content');
        this.progress = this.loadProgress(); // Load progress tracking

        // Program directory element
        this.programDirectory = document.getElementById('program-directory');
        this.expandedCategories = new Set(); // Track which categories are expanded
        this.expandedSubcategories = new Set(); // Track which subcategories are expanded

        this.init();
    }

    async init() {
        try {
            await this.loadPrograms();
            this.renderProgramDirectory();
            this.setupEventListeners();

            const hashState = this.getStateFromHash();
            const storedState = this.getStoredState();

            const programId = hashState.programId || storedState.programId || null;
            const pageIndex = Number.isInteger(hashState.pageIndex)
                ? hashState.pageIndex
                : (Number.isInteger(storedState.pageIndex) ? storedState.pageIndex : 0);

            if (programId) {
                await this.switchProgram(programId, pageIndex);
            } else {
                // Show dashboard by default
                this.showDashboard();
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

    async showDashboard() {
        // Clear current program state
        this.currentProgram = null;
        this.manifest = null;
        this.modules = [];

        // Update directory selection
        this.updateDirectorySelection(null);

        // Update page title
        document.title = 'Training Library';

        // Update mobile header title
        const mobileTitle = document.getElementById('mobile-title');
        if (mobileTitle) {
            mobileTitle.textContent = 'Training Library';
        }

        // Clear navigation
        this.navMenu.innerHTML = '';
        this.progressIndicator.innerHTML = 'Dashboard';

        // Show loading state
        this.contentArea.innerHTML = '<div class="loading">Loading dashboard...</div>';

        // Render dashboard (async to load progress)
        this.contentArea.innerHTML = await this.renderDashboardContent();

        // Update URL
        history.pushState({ dashboard: true }, '', '#');
        this.storeState(null, null);

        // Setup card click listeners
        this.setupDashboardListeners();
    }

    async renderDashboardContent() {
        // Load progress for all programs
        const progressPromises = this.programs.programs.map(program =>
            this.getProgramProgressWithManifest(program.id)
        );
        const progressResults = await Promise.all(progressPromises);
        const progressMap = {};
        this.programs.programs.forEach((program, index) => {
            progressMap[program.id] = progressResults[index];
        });

        // Calculate overall stats
        let totalModules = 0;
        let completedModules = 0;
        let completedPrograms = 0;
        let inProgressPrograms = [];

        this.programs.programs.forEach(program => {
            const progress = progressMap[program.id];
            totalModules += progress.total;
            completedModules += progress.completed;
            if (progress.completed === progress.total && progress.total > 0) {
                completedPrograms++;
            } else if (progress.completed > 0) {
                inProgressPrograms.push({ program, progress });
            }
        });

        const overallPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        let html = `
            <div class="dashboard">
                <div class="welcome-banner">
                    <div class="welcome-content">
                        <h1>Welcome</h1>
                        <p>Build your skills with guided programs designed to help you master Zoho tools and best practices.</p>
                    </div>
                    <div class="welcome-graphic">
                        <img src="one-logo.png" alt="Zoho One" class="welcome-logo">
                    </div>
                </div>
                <div class="dashboard-progress-section">
                    <div class="overall-progress">
                        <div class="overall-progress-header">
                            <h2>Your Progress</h2>
                            <span class="overall-percentage">${overallPercentage}%</span>
                        </div>
                        <div class="overall-progress-bar">
                            <div class="overall-progress-fill" style="width: ${overallPercentage}%"></div>
                        </div>
                        <div class="progress-stats">
                            <div class="stat">
                                <span class="stat-value">${completedModules}</span>
                                <span class="stat-label">Modules Completed</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${completedPrograms}</span>
                                <span class="stat-label">Programs Completed</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${this.programs.programs.length}</span>
                                <span class="stat-label">Total Programs</span>
                            </div>
                        </div>
                    </div>
                    ${inProgressPrograms.length > 0 ? `
                    <div class="in-progress-section">
                        <h3>Continue Learning</h3>
                        <div class="in-progress-list">
                            ${inProgressPrograms.map(({ program, progress }) => `
                                <button class="in-progress-item" data-program-id="${program.id}" data-action="resume">
                                    <span class="in-progress-icon">${program.icon || '📚'}</span>
                                    <div class="in-progress-info">
                                        <span class="in-progress-title">${program.title}</span>
                                        <div class="in-progress-bar">
                                            <div class="in-progress-fill" style="width: ${progress.percentage}%"></div>
                                        </div>
                                    </div>
                                    <span class="in-progress-percent">${progress.percentage}%</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Dev tools - Reset progress button
        html += `
            <div class="dev-tools">
                <button class="reset-progress-btn" onclick="window.trainingApp.resetAllProgress()">
                    🔄 Reset All Progress (Dev)
                </button>
            </div>
        `;

        return html;
    }

    setupDashboardListeners() {
        // Handle "Continue Learning" item clicks
        const inProgressItems = this.contentArea.querySelectorAll('.in-progress-item');
        inProgressItems.forEach(item => {
            item.addEventListener('click', async () => {
                const programId = item.dataset.programId;
                const program = this.programs.programs.find(p => p.id === programId);
                if (program) {
                    await this.loadManifest(program.manifest);
                    const nextIndex = this.getNextIncompleteModule(programId);
                    await this.switchProgram(programId, nextIndex);
                }
            });
        });
    }

    renderProgramDirectory() {
        if (!this.programDirectory) return;

        this.programDirectory.innerHTML = '';

        // Group programs by category and subcategory
        const categories = {};
        this.programs.programs.forEach(program => {
            const category = program.category || 'Other';
            const subcategory = program.subcategory || 'General';
            if (!categories[category]) {
                categories[category] = {};
            }
            if (!categories[category][subcategory]) {
                categories[category][subcategory] = [];
            }
            categories[category][subcategory].push(program);
        });

        // Create collapsible directory tree
        // Custom sort: Foundations first, Workdrive second, then alphabetical
        const categoryOrder = ['Foundations', 'Workdrive'];
        Object.keys(categories).sort((a, b) => {
            const aIndex = categoryOrder.indexOf(a);
            const bIndex = categoryOrder.indexOf(b);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
        }).forEach(categoryName => {
            const categorySection = document.createElement('div');
            categorySection.className = 'directory-category';
            categorySection.dataset.category = categoryName;

            // Category header (clickable to expand/collapse)
            const categoryHeader = document.createElement('button');
            categoryHeader.type = 'button';
            categoryHeader.className = 'directory-category-header';
            const isExpanded = this.expandedCategories.has(categoryName);
            categoryHeader.innerHTML = `
                <span class="directory-toggle">${isExpanded ? '▼' : '▶'}</span>
                <span class="directory-category-name">${categoryName}</span>
            `;
            categoryHeader.addEventListener('click', () => this.toggleCategory(categoryName));
            categorySection.appendChild(categoryHeader);

            // Category content (subcategories and programs)
            const categoryContent = document.createElement('div');
            categoryContent.className = 'directory-category-content';
            if (!isExpanded) {
                categoryContent.classList.add('collapsed');
            }

            // Add subcategories
            Object.keys(categories[categoryName]).sort((a, b) => a.localeCompare(b)).forEach(subcategoryName => {
                const subcatKey = `${categoryName}:${subcategoryName}`;
                const subcategorySection = document.createElement('div');
                subcategorySection.className = 'directory-subcategory';

                // Subcategory header
                const subcatHeader = document.createElement('button');
                subcatHeader.type = 'button';
                subcatHeader.className = 'directory-subcategory-header';
                const isSubExpanded = this.expandedSubcategories.has(subcatKey);
                subcatHeader.innerHTML = `
                    <span class="directory-toggle">${isSubExpanded ? '▼' : '▶'}</span>
                    <span class="directory-subcategory-name">${subcategoryName}</span>
                `;
                subcatHeader.addEventListener('click', () => this.toggleSubcategory(categoryName, subcategoryName));
                subcategorySection.appendChild(subcatHeader);

                // Subcategory content (programs)
                const subcatContent = document.createElement('div');
                subcatContent.className = 'directory-subcategory-content';
                if (!isSubExpanded) {
                    subcatContent.classList.add('collapsed');
                }

                // Add programs
                categories[categoryName][subcategoryName].forEach(program => {
                    const programItem = document.createElement('button');
                    programItem.type = 'button';
                    programItem.className = 'directory-program';
                    programItem.dataset.programId = program.id;
                    programItem.innerHTML = `
                        <span class="directory-program-icon">${program.icon || '📚'}</span>
                        <span class="directory-program-title">${program.title}</span>
                    `;
                    programItem.addEventListener('click', () => {
                        this.switchProgram(program.id);
                        this.closeMobileMenu();
                    });
                    subcatContent.appendChild(programItem);
                });

                subcategorySection.appendChild(subcatContent);
                categoryContent.appendChild(subcategorySection);
            });

            categorySection.appendChild(categoryContent);
            this.programDirectory.appendChild(categorySection);
        });
    }

    toggleCategory(categoryName) {
        if (this.expandedCategories.has(categoryName)) {
            this.expandedCategories.delete(categoryName);
        } else {
            this.expandedCategories.add(categoryName);
        }
        this.renderProgramDirectory();
        this.updateDirectorySelection(this.currentProgram?.id);
    }

    toggleSubcategory(categoryName, subcategoryName) {
        const key = `${categoryName}:${subcategoryName}`;
        if (this.expandedSubcategories.has(key)) {
            this.expandedSubcategories.delete(key);
        } else {
            this.expandedSubcategories.add(key);
        }
        this.renderProgramDirectory();
        this.updateDirectorySelection(this.currentProgram?.id);
    }

    updateDirectorySelection(programId) {
        if (!this.programDirectory) return;

        // Remove selected class from all programs
        const allPrograms = this.programDirectory.querySelectorAll('.directory-program');
        allPrograms.forEach(p => p.classList.remove('selected'));

        if (programId) {
            // Add selected class to the chosen program
            const selectedProgram = this.programDirectory.querySelector(`[data-program-id="${programId}"]`);
            if (selectedProgram) {
                selectedProgram.classList.add('selected');

                // Auto-expand parent categories if not already expanded
                const program = this.programs.programs.find(p => p.id === programId);
                if (program) {
                    const category = program.category || 'Other';
                    const subcategory = program.subcategory || 'General';
                    const subcatKey = `${category}:${subcategory}`;

                    if (!this.expandedCategories.has(category) || !this.expandedSubcategories.has(subcatKey)) {
                        this.expandedCategories.add(category);
                        this.expandedSubcategories.add(subcatKey);
                        this.renderProgramDirectory();
                        // Re-select after re-render
                        const reselected = this.programDirectory.querySelector(`[data-program-id="${programId}"]`);
                        if (reselected) {
                            reselected.classList.add('selected');
                        }
                    }
                }
            }
        }
    }

    async switchProgram(programId, pageIndex = 0) {
        const program = this.programs.programs.find(p => p.id === programId);
        if (!program) return;

        this.currentProgram = program;

        // Update directory selection
        this.updateDirectorySelection(programId);

        // Update page title
        document.title = `${program.title} - Training`;

        // Update mobile header title
        const mobileTitle = document.getElementById('mobile-title');
        if (mobileTitle) {
            mobileTitle.textContent = program.title;
        }

        // Always load the manifest for the selected program
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

            // Restore progress indicator structure if needed (e.g., coming from dashboard)
            this.progressIndicator.innerHTML = '<span id="current-page">1</span> / <span id="total-pages">1</span>';
            this.currentPageSpan = document.getElementById('current-page');
            this.totalPagesSpan = document.getElementById('total-pages');

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

        // Create collapsible container for mobile
        const lessonsToggle = document.createElement('button');
        lessonsToggle.className = 'lessons-toggle';
        lessonsToggle.innerHTML = `
            <span class="lessons-toggle-text">Show Lessons</span>
            <span class="lessons-toggle-icon">▼</span>
        `;

        const lessonsContainer = document.createElement('div');
        lessonsContainer.className = 'lessons-container collapsed';

        lessonsToggle.addEventListener('click', () => {
            const isCollapsed = lessonsContainer.classList.toggle('collapsed');
            lessonsToggle.querySelector('.lessons-toggle-text').textContent = isCollapsed ? 'Show Lessons' : 'Hide Lessons';
            lessonsToggle.querySelector('.lessons-toggle-icon').textContent = isCollapsed ? '▼' : '▲';
        });

        this.modules.forEach((module, index) => {
            const navItem = document.createElement('div');
            navItem.className = 'nav-item';
            const isComplete = this.isModuleComplete(this.currentProgram.id, module.id);

            if (isComplete) {
                navItem.classList.add('completed');
            }

            navItem.innerHTML = `
                <span class="nav-item-number">${isComplete ? '✓' : index + 1}</span>
                <span class="nav-item-title">${module.title}</span>
            `;
            navItem.addEventListener('click', () => {
                this.loadPage(index);
                this.closeMobileMenu(); // Close menu after selecting item
            });
            lessonsContainer.appendChild(navItem);
        });

        this.navMenu.appendChild(lessonsToggle);
        this.navMenu.appendChild(lessonsContainer);
    }

    setupEventListeners() {
        // Dashboard button
        const dashboardBtn = document.getElementById('dashboard-btn');
        dashboardBtn.addEventListener('click', () => {
            this.showDashboard();
            this.closeMobileMenu(); // Close menu when navigating
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Close menus on Escape
            if (e.key === 'Escape') {
                this.closeMobileMenu();
            }
            // Navigation only when sidebar is closed
            if (!sidebar?.classList.contains('open')) {
                if (e.key === 'ArrowLeft') {
                    this.navigatePrevious();
                } else if (e.key === 'ArrowRight') {
                    this.navigateNext();
                }
            }
        });
    }

    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');

        if (sidebar && mobileMenuBtn) {
            const isOpen = sidebar.classList.toggle('open');
            mobileMenuBtn.classList.toggle('active', isOpen);

            // Prevent body scroll when menu is open
            document.body.style.overflow = isOpen ? 'hidden' : '';

            // Rebuild navigation when opening menu if we have a program loaded
            if (isOpen && this.currentProgram && this.modules.length > 0) {
                this.renderNavigation();
                this.updateNavigation();
            }
        }
    }

    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');

        if (sidebar && mobileMenuBtn) {
            sidebar.classList.remove('open');
            mobileMenuBtn.classList.remove('active');
            document.body.style.overflow = '';
        }
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
        const currentModule = this.modules[this.currentPageIndex];
        const isComplete = this.isModuleComplete(this.currentProgram.id, currentModule.id);

        let html = '<div class="inline-nav">';

        // Previous button
        if (hasPrevious) {
            html += `
                <button class="inline-nav-btn prev-btn" onclick="window.trainingApp.navigatePrevious()">
                    <span>←</span> Previous
                </button>
            `;
        } else {
            html += '<div></div>'; // Empty div for spacing
        }

        // Mark complete button (center)
        if (isComplete) {
            html += `
                <button class="inline-nav-btn mark-incomplete-btn" onclick="window.trainingApp.toggleModuleComplete()">
                    ✗ Mark Incomplete
                </button>
            `;
        } else {
            html += `
                <button class="inline-nav-btn mark-complete-btn" onclick="window.trainingApp.toggleModuleComplete()">
                    ✓ Mark Complete
                </button>
            `;
        }

        // Next button
        if (hasNext) {
            html += `
                <button class="inline-nav-btn next-btn" onclick="window.trainingApp.navigateNext()">
                    Next <span>→</span>
                </button>
            `;
        } else {
            html += '<div></div>'; // Empty div for spacing
        }

        html += '</div>';
        return html;
    }

    toggleModuleComplete() {
        const currentModule = this.modules[this.currentPageIndex];
        if (!currentModule || !this.currentProgram) return;

        const isCurrentlyComplete = this.isModuleComplete(this.currentProgram.id, currentModule.id);

        if (isCurrentlyComplete) {
            // Mark as incomplete
            if (this.progress[this.currentProgram.id]) {
                delete this.progress[this.currentProgram.id][currentModule.id];
                this.saveProgress();
            }
            // Refresh the page content to update button
            this.loadPage(this.currentPageIndex);
            // Rebuild navigation to show/hide checkmark
            this.renderNavigation();
        } else {
            // Mark as complete
            this.markModuleComplete(this.currentProgram.id, currentModule.id);
            this.renderNavigation();

            // Check if this is the last module
            const isLastModule = this.currentPageIndex === this.modules.length - 1;

            if (isLastModule) {
                // Show completion celebration
                this.showProgramCompletion();
            } else {
                // Auto-advance to next module
                this.loadPage(this.currentPageIndex + 1);
            }
        }
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
            // Mark current module as complete when moving forward
            const currentModule = this.modules[this.currentPageIndex];
            if (this.currentProgram && currentModule) {
                this.markModuleComplete(this.currentProgram.id, currentModule.id);
                this.renderNavigation(); // Rebuild navigation to show checkmark
            }
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

    showProgramCompletion() {
        // Trigger confetti animation
        const duration = 3000;
        const end = Date.now() + duration;

        const colors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6'];

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());

        // Show completion message
        this.contentArea.innerHTML = `
            <div class="completion-screen">
                <div class="completion-content">
                    <div class="completion-icon">🎉</div>
                    <h1>Congratulations!</h1>
                    <p class="completion-message">You've completed <strong>${this.currentProgram.title}</strong>!</p>
                    <p class="completion-stats">All ${this.modules.length} modules completed</p>
                    <div class="completion-actions">
                        <button class="completion-btn primary" onclick="window.trainingApp.showDashboard()">
                            Back to Dashboard
                        </button>
                        <button class="completion-btn secondary" onclick="window.trainingApp.loadPage(0)">
                            Review Program
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Update progress indicator
        this.currentPageSpan.textContent = this.modules.length;

        // Scroll to top
        if (this.contentContainer) {
            this.contentContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
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

    // Progress tracking methods
    loadProgress() {
        try {
            const raw = localStorage.getItem('trainingProgress');
            if (!raw) {
                return {};
            }
            return JSON.parse(raw);
        } catch (error) {
            return {};
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('trainingProgress', JSON.stringify(this.progress));
        } catch (error) {
            // Ignore storage failures
        }
    }

    markModuleComplete(programId, moduleId) {
        if (!this.progress[programId]) {
            this.progress[programId] = {};
        }
        this.progress[programId][moduleId] = {
            completed: true,
            lastVisited: Date.now()
        };
        this.saveProgress();
    }

    isModuleComplete(programId, moduleId) {
        return this.progress[programId]?.[moduleId]?.completed || false;
    }

    getProgramProgress(programId) {
        const program = this.programs.programs.find(p => p.id === programId);
        if (!program) return { completed: 0, total: 0, percentage: 0 };

        // We need to load the manifest to know how many modules
        // For now, we'll calculate based on what we have in progress
        const programProgress = this.progress[programId] || {};
        const completedCount = Object.values(programProgress).filter(m => m.completed).length;

        return { completed: completedCount, total: 0, percentage: 0 };
    }

    async getProgramProgressWithManifest(programId) {
        const program = this.programs.programs.find(p => p.id === programId);
        if (!program) return { completed: 0, total: 0, percentage: 0 };

        try {
            const response = await fetch(program.manifest);
            if (!response.ok) throw new Error('Failed to fetch manifest');
            const manifest = await response.json();
            const totalModules = manifest.modules.length;

            const programProgress = this.progress[programId] || {};
            const completedCount = Object.values(programProgress).filter(m => m.completed).length;
            const percentage = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

            return { completed: completedCount, total: totalModules, percentage };
        } catch (error) {
            return { completed: 0, total: 0, percentage: 0 };
        }
    }

    getNextIncompleteModule(programId) {
        if (!this.modules || this.modules.length === 0) return 0;

        for (let i = 0; i < this.modules.length; i++) {
            if (!this.isModuleComplete(programId, this.modules[i].id)) {
                return i;
            }
        }

        // All complete, return first module
        return 0;
    }

    // Dev tool - Reset all progress
    resetAllProgress() {
        if (confirm('Reset all progress? This will clear all completion tracking.')) {
            localStorage.removeItem('trainingProgress');
            this.progress = {};
            this.showDashboard();
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.trainingApp = new TrainingApp();

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (!window.trainingApp) return;

        // Check if returning to dashboard
        if (e.state && e.state.dashboard) {
            window.trainingApp.showDashboard();
            return;
        }

        if (e.state && typeof e.state.page === 'number' && e.state.programId) {
            if (window.trainingApp.currentProgram?.id !== e.state.programId) {
                window.trainingApp.switchProgram(e.state.programId, e.state.page);
                return;
            }
            window.trainingApp.loadPage(e.state.page);
            return;
        }

        const hashState = window.trainingApp.getStateFromHash();
        if (!hashState.programId) {
            // No program in hash, show dashboard
            window.trainingApp.showDashboard();
        } else if (hashState.programId && window.trainingApp.currentProgram?.id !== hashState.programId) {
            window.trainingApp.switchProgram(hashState.programId, hashState.pageIndex ?? 0);
        } else if (Number.isInteger(hashState.pageIndex)) {
            window.trainingApp.loadPage(hashState.pageIndex);
        }
    });
});
