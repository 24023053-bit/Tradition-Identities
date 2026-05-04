import * as CANNON from 'cannon-es';

export class PhysicsManager {
    // Khởi tạo thế giới vật lý
  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0,-12,0); // Thiết lập trọng lực theo trục Y để tạo cảm giác rơi tự nhiên
  }

  // Cập nhật vật lý mỗi khung hình
  update(delta){
    this.world.step(1/60, delta, 3);
  }
}