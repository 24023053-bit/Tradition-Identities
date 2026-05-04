export class UIManager {
    constructor() {
        this.slots = [
            document.getElementById('slot-0'),
            document.getElementById('slot-1'),
            document.getElementById('slot-2')
        ].filter(Boolean);

        this.questionModal = document.getElementById('question-modal');
        this.toast = document.getElementById('toast-notification');
        
        this.initFailOverlay();
    }

    initFailOverlay() {
        let overlay = document.getElementById('fail-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fail-overlay';
            overlay.className = 'modal-overlay';
            overlay.style.display = 'none';
            document.body.appendChild(overlay);
        }
        this.failOverlay = overlay;
    }

    // UIManager.js
    showQuestion(data, onResult) {
        this.questionModal.style.display = 'flex';
        this.questionModal.innerHTML = `
            <div class="question-container">
                <h3>${data.question}</h3>
                <div class="options">
                    ${data.options.map((opt, i) => 
                        `<button class="answer-btn" data-idx="${i}">${opt}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        const btns = this.questionModal.querySelectorAll('.answer-btn');
        btns.forEach(btn => {
            btn.onclick = () => {
                const isCorrect = (parseInt(btn.dataset.idx) === data.answer); // So sánh index[cite: 8]
                this.questionModal.style.display = 'none';
                onResult(isCorrect);
            };
        });
    }

    showFailModal(onRetry) {
        if (!this.failOverlay) return;

        this.failOverlay.style.display = 'flex';
        this.failOverlay.innerHTML = `
            <div class="fail-content">
                <h1 class="fail-title">NỒ NÔ!</h1>
                <p class="fail-desc">Kiến thức của bạn thật giản dị...</p>
                <button id="retry-btn">TRẢ LỜI LẠI</button>
            </div>
        `;

        document.getElementById('retry-btn').onclick = () => {
            this.failOverlay.style.display = 'none';
            if (onRetry) onRetry();
        };
    }

    activateSlot(index, color) {
        const slot = this.slots[index];
        if (!slot) return;

        const hexColor = typeof color === 'number' 
            ? '#' + color.toString(16).padStart(6, '0') 
            : color;

        slot.style.backgroundColor = hexColor;
        slot.style.boxShadow = `0 0 20px ${hexColor}`;
        slot.classList.add('active');
    }

    reset() {
        this.slots.forEach(slot => {
            slot.style.backgroundColor = '';
            slot.style.boxShadow = '';
            slot.classList.remove('active');
        });
        if (this.questionModal) this.questionModal.style.display = 'none';
        if (this.failOverlay) this.failOverlay.style.display = 'none';
    }
}