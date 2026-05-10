export class UIManager {
    constructor(game) { // nhận game vào đây
        this.game = game;
        this.slots = [
            document.getElementById('slot-0'),
            document.getElementById('slot-1'),
            document.getElementById('slot-2')
        ].filter(Boolean);

        this.quizContainer = document.getElementById('quiz-modal');
        this.questionEl = document.getElementById('quiz-question');
        this.optionsContainer = document.getElementById('quiz-options');

        this.initFailOverlay();
    }

    initFailOverlay() {
        let overlay = document.getElementById('fail-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fail-overlay';
            overlay.style.cssText = `
                display:none; position:fixed; inset:0;
                background:rgba(0,0,0,0.75);
                align-items:center; justify-content:center; z-index:10000;
            `;
            document.body.appendChild(overlay);
        }
        this.failOverlay = overlay;
    }

    // Hiện quiz, nhận thêm callback onCorrect để game xử lý collect
    showQuiz(quest, onCorrect) {
        this.quizContainer.style.display = 'flex';
        this.questionEl.innerText = quest.question;
        this.optionsContainer.innerHTML = '';

        quest.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-btn';
            btn.innerText = option;
            btn.onclick = () => this._checkAnswer(index, quest, onCorrect);
            this.optionsContainer.appendChild(btn);
        });
    }

    _checkAnswer(selectedIndex, quest, onCorrect) {
        const btns = this.optionsContainer.querySelectorAll('.quiz-btn');

        if (selectedIndex === quest.correctIndex) {
            // Highlight đáp án đúng màu xanh
            btns[selectedIndex].style.background = '#4caf50';
            btns[selectedIndex].style.color = 'white';

            // Hiện fact rồi đóng
            this._showFact(quest.fact, () => {
                this.quizContainer.style.display = 'none';
                if (onCorrect) onCorrect(); // <-- game.handleCollect(item)
            });
        } else {
            // Highlight sai màu đỏ, đúng màu xanh
            btns[selectedIndex].style.background = '#f44336';
            btns[selectedIndex].style.color = 'white';
            btns[quest.correctIndex].style.background = '#4caf50';
            btns[quest.correctIndex].style.color = 'white';

            // Vô hiệu hóa tất cả nút
            btns.forEach(b => b.disabled = true);

            this._showFact(`❌ Sai rồi! Đáp án đúng: ${quest.options[quest.correctIndex]}\n💡 ${quest.fact}`, () => {
                // Đặt lại để thử lại
                this.quizContainer.style.display = 'none';
            });
        }
    }

    _showFact(text, callback) {
        const factEl = document.createElement('div');
        factEl.style.cssText = `
            margin-top: 16px; padding: 12px 16px;
            background: rgba(255,221,0,0.15); border-left: 4px solid #ffdd00;
            border-radius: 6px; color: #fff; font-size: 14px;
            white-space: pre-line; line-height: 1.5;
        `;
        factEl.innerText = text;
        this.optionsContainer.appendChild(factEl);

        setTimeout(callback, 2200);
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
        if (this.quizContainer) this.quizContainer.style.display = 'none';
        if (this.failOverlay) this.failOverlay.style.display = 'none';
    }
}