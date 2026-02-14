/**
 * Pagination Module
 * Handles transcript pagination for long meetings
 */
window.PaginationManager = {
    _currentPage: 1,
    _totalPages: 1,
    _pageSize: 100,

    initialize() {
        this._pageSize = window.AppConstants?.TIMING?.PAGINATION_PAGE_SIZE || 100;
        const prevBtn = document.getElementById('paginationPrev');
        const nextBtn = document.getElementById('paginationNext');
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
        console.log('📄 [PAGINATION] PaginationManager initialized (pageSize:', this._pageSize + ')');
    },

    setTotalItems(count) {
        this._totalPages = Math.max(1, Math.ceil(count / this._pageSize));
        if (this._currentPage > this._totalPages) {
            this._currentPage = this._totalPages;
        }
    },

    getCurrentPageItems(allItems) {
        if (!this.shouldPaginate(allItems.length)) {
            return allItems;
        }
        const start = (this._currentPage - 1) * this._pageSize;
        return allItems.slice(start, start + this._pageSize);
    },

    goToPage(page) {
        const newPage = Math.max(1, Math.min(page, this._totalPages));
        if (newPage === this._currentPage) return;

        this._currentPage = newPage;
        this.renderControls();

        // Trigger transcript re-render
        if (window.transcriptData) {
            window.displayTranscript?.(window.transcriptData);
        }

        // Scroll transcript to top
        const container = document.getElementById('transcriptContent');
        if (container) container.scrollTop = 0;
    },

    nextPage() { this.goToPage(this._currentPage + 1); },
    previousPage() { this.goToPage(this._currentPage - 1); },

    resetToFirstPage() {
        this._currentPage = 1;
    },

    renderControls() {
        const container = document.getElementById('paginationControls');
        if (!container) return;

        if (this._totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        const prevBtn = document.getElementById('paginationPrev');
        const nextBtn = document.getElementById('paginationNext');
        const info = document.getElementById('paginationInfo');

        if (prevBtn) prevBtn.disabled = this._currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this._currentPage >= this._totalPages;
        if (info) info.textContent = `Strona ${this._currentPage} z ${this._totalPages}`;
    },

    shouldPaginate(itemCount) {
        return itemCount > this._pageSize;
    },

    getCurrentPage() {
        return this._currentPage;
    },

    getTotalPages() {
        return this._totalPages;
    }
};
