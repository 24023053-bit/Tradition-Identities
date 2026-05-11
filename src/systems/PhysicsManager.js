import * as CANNON from 'cannon-es';

export class PhysicsManager {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -12, 0);

        // 1. Tạo các loại vật liệu (Materials)
        this.groundMaterial = new CANNON.Material('groundMaterial');
        this.playerMaterial = new CANNON.Material('playerMaterial');

        // 2. Định nghĩa cách 2 vật liệu này tiếp xúc với nhau (ContactMaterial)
        const playerGroundContact = new CANNON.ContactMaterial(
            this.playerMaterial,
            this.groundMaterial,
            {
                friction: 0.0,      // Ma sát bằng 0 giúp không bị kẹt ở các gờ/góc
                restitution: 0.1,   // Độ nảy thấp để nhân vật không bị tưng tưng
                contactEquationStiffness: 1e8, // Độ cứng của va chạm
                contactEquationRelaxation: 3   // Giúp ổn định va chạm tại các điểm nối
            }
        );

        // 3. Thêm cấu hình tiếp xúc vào thế giới vật lý
        this.world.addContactMaterial(playerGroundContact);
    }

    update(delta) {
        // Đảm bảo step cố định 1/60 để vật lý ổn định nhất
        this.world.step(1/60, delta, 3);
    }
}