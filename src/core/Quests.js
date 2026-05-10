// src/core/Quests.js

// src/core/Quests.js

export const QUEST_DATA = {
    Gate: {
        name: "Cổng Trường",
        quests: []
    },
    Map01: {
        name: "Biển Hồ",
        itemQuizzes: [
            {
                question: "Hồ Hoàn Kiếm gắn với truyền thuyết nào?",
                options: ["A. Sơn Tinh Thủy Tinh", "B. Thánh Gióng", "C. Hoàn gươm", "D. Bánh chưng bánh dày"],
                correctIndex: 2,
                fact: "Vua Lê Lợi trả gươm thần cho Rùa Vàng tại hồ này."
            },
            {
                question: "Làng nghề nào nổi tiếng ở Hà Nội?",
                options: ["A. Làng Lụa Vạn Phúc", "B. Làng gốm Bát Tràng", "C. Cả hai", "D. Không có"],
                correctIndex: 2,
                fact: "Hà Nội có nhiều làng nghề truyền thống nổi tiếng."
            },
            {
                question: "36 phố phường Hà Nội thuộc khu vực nào?",
                options: ["A. Hoàn Kiếm", "B. Đống Đa", "C. Ba Đình", "D. Cầu Giấy"],
                correctIndex: 0,
                fact: "Phố cổ Hà Nội nằm ở quận Hoàn Kiếm."
            }
        ]
    },
    Vm: {
        name: "Văn Miếu",
        itemQuizzes: [
            {
                question: "Văn Miếu – Quốc Tử Giám được xây dựng năm nào?",
                options: ["A. 1010", "B. 1070", "C. 1225", "D. 1400"],
                correctIndex: 1,
                fact: "Văn Miếu xây năm 1070 dưới thời vua Lý Thánh Tông."
            },
            {
                question: "Văn Miếu thờ ai là chính?",
                options: ["A. Phật Thích Ca", "B. Lão Tử", "C. Khổng Tử", "D. Trần Hưng Đạo"],
                correctIndex: 2,
                fact: "Văn Miếu thờ Khổng Tử – người sáng lập Nho giáo."
            },
            {
                question: "Bia Tiến sĩ tại Văn Miếu được UNESCO công nhận là gì?",
                options: ["A. Di sản văn hóa thế giới", "B. Di sản tư liệu thế giới", "C. Kỳ quan thế giới", "D. Bảo vật quốc gia"],
                correctIndex: 1,
                fact: "82 tấm bia Tiến sĩ là Di sản tư liệu thế giới khu vực Châu Á - Thái Bình Dương."
            }
        ]
    },
    chua: {
        name: "Chùa Một Cột",
        itemQuizzes: [
            {
                question: "Tên gọi nào sau đây là tên cũ của thủ đô Hà Nội?",
                options: ["A. Phú Xuân", "B. Thăng Long", "C. Hoa Lư", "D. Tây Đô"],
                correctIndex: 1,
                fact: "Thăng Long có nghĩa là Rồng bay lên, gắn với vua Lý Thái Tổ."
            },
            {
                question: "Chùa Một Cột được xây dựng dưới triều đại nào?",
                options: ["A. Nhà Trần", "B. Nhà Lê", "C. Nhà Lý", "D. Nhà Nguyễn"],
                correctIndex: 2,
                fact: "Chùa Một Cột xây năm 1049 dưới thời vua Lý Thái Tông."
            },
            {
                question: "Chùa Một Cột tượng trưng cho hình ảnh gì?",
                options: ["A. Núi thiêng", "B. Hoa sen nở trên mặt nước", "C. Mặt trăng phản chiếu", "D. Rồng vươn lên"],
                correctIndex: 1,
                fact: "Kiến trúc chùa mô phỏng bông sen nở trên hồ nước."
            }
        ]
    }
};

export class QuestManager {
    constructor(game) {
        this.game = game;
        this.activeQuest = null;
        this.completedQuests = [];
    }

    // Hàm để lấy dữ liệu quest hiện tại dựa trên map
    getQuest(mapKey, index = 0) {
        return QUEST_DATA[mapKey]?.quests[index];
    }
}