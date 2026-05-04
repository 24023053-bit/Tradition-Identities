export class UIManager {
    constructor() {
        this.slots = [
            document.getElementById('slot-0'),
            document.getElementById('slot-1'),
            document.getElementById('slot-2')
        ];
    }

    activateSlot(index, color) {
        if (this.slots[index]) {
            this.slots[index].style.backgroundColor = '#' + color.toString(16).padStart(6, '0');
            this.slots[index].classList.add('active');
        }
    }

    reset() {
        this.slots.forEach(slot => {
            slot.style.backgroundColor = '';
            slot.classList.remove('active');
        });
    }
}