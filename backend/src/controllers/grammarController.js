const Grammar = require('../models/Grammar');

const TENSE_DETAILS = {
  'Simple Present': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + V(s/es) + O\n- **Phủ định:** S + do/does + not + V(bare) + O\n- **Nghi vấn:** Do/Does + S + V(bare) + O?\n\n### 2. Cách dùng (Usage)\n- Diễn tả một thói quen, hành động lặp đi lặp lại ở hiện tại (always, usually, often, sometimes, never...).\n- Diễn tả một chân lý, sự thật hiển nhiên.\n- Lịch trình, thời gian biểu (tàu, xe, phim ảnh).\n\n### 3. Ví dụ (Examples)\n- *IELTS Speaking:* "I usually **read** books in my free time to broaden my horizons."\n- *Giao tiếp:* "The sun **rises** in the East."\n- *Lịch trình:* "The train to Hanoi **leaves** at 8 PM."\n\n### 4. So sánh với thì khác\n- **Hiện tại đơn vs. Hiện tại tiếp diễn:** HTĐ nói về thói quen, sự thật (luôn đúng), trong khi HTTD nói về hành động đang diễn ra tại thời điểm nói.\n  - *He **works** as a doctor.* (Nghề nghiệp của anh ấy)\n  - *He **is working** in the garden now.* (Hành động tạm thời)\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Luôn nhớ thêm \`-s\`/\`-es\` cho động từ đi với ngôi thứ ba số ít (he, she, it).\n- **Lỗi sai:** Quên chia động từ. *Sai: She **go** to school.* -> *Đúng: She **goes** to school.*`
  },
  'Present Continuous': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + am/is/are + V-ing\n- **Phủ định:** S + am/is/are + not + V-ing\n- **Nghi vấn:** Am/Is/Are + S + V-ing?\n\n### 2. Cách dùng (Usage)\n- Hành động đang xảy ra tại thời điểm nói (now, at the moment).\n- Hành động đang diễn ra xung quanh thời điểm nói (nhưng không nhất thiết ngay lúc nói).\n- Kế hoạch chắc chắn trong tương lai gần (có thời gian, địa điểm cụ thể).\n- Phàn nàn về một hành động lặp đi lặp lại gây khó chịu (với 'always', 'constantly').\n\n### 3. Ví dụ (Examples)\n- *IELTS Speaking:* "As you can see from the chart, the number of tourists **is increasing** steadily."\n- *Giao tiếp:* "Please be quiet. The baby **is sleeping**."\n- *Tương lai gần:* "I **am meeting** my professor tomorrow at 10 AM."\n- *Phàn nàn:* "He **is always losing** his keys!"\n\n### 4. So sánh với thì khác\n- **Hiện tại tiếp diễn vs. Hiện tại đơn:** HTTD diễn tả hành động tạm thời, trong khi HTĐ diễn tả sự việc lâu dài, ổn định.\n  - *I **am living** with my parents until I find my own apartment.* (Tạm thời)\n  - *I **live** with my parents.* (Lâu dài)\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Dấu hiệu nhận biết là các trạng từ chỉ thời gian như 'now', 'right now', 'at the moment', 'at present'.\n- **Lỗi sai:** Dùng với các động từ chỉ trạng thái (stative verbs) như 'know', 'believe', 'want', 'need'. *Sai: I **am wanting** a cup of coffee.* -> *Đúng: I **want** a cup of coffee.*`
  },
  'Present Perfect': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + have/has + V3/ed\n- **Phủ định:** S + have/has + not + V3/ed\n- **Nghi vấn:** Have/Has + S + V3/ed?\n\n### 2. Cách dùng (Usage)\n- Hành động đã xảy ra trong quá khứ nhưng không rõ thời gian, kết quả còn liên quan đến hiện tại.\n- Trải nghiệm hoặc kinh nghiệm sống (với 'ever', 'never', 'before').\n- Hành động bắt đầu trong quá khứ, kéo dài đến hiện tại (với 'for', 'since').\n- Hành động vừa mới xảy ra (với 'just', 'recently', 'lately').\n\n### 3. Ví dụ (Examples)\n- *IELTS Writing:* "The government **has implemented** several policies to tackle unemployment." (Kết quả là các chính sách đang có hiệu lực)\n- *Giao tiếp (Trải nghiệm):* "**Have** you ever **been** to Japan?"\n- *Giao tiếp (Kéo dài):* "She **has lived** here for ten years."\n\n### 4. So sánh với thì khác\n- **Hiện tại hoàn thành vs. Quá khứ đơn:** HTHT không nhấn mạnh thời gian, QKĐ luôn đi với thời gian xác định trong quá khứ.\n  - *I **have seen** that movie.* (Không rõ xem khi nào)\n  - *I **saw** that movie yesterday.* (Rõ thời gian là 'yesterday')\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Nhớ các trạng từ đặc trưng: 'just', 'yet', 'already', 'ever', 'never', 'for', 'since'.\n- **Lỗi sai:** Dùng HTHT với mốc thời gian đã kết thúc. *Sai: I **have finished** my homework yesterday.* -> *Đúng: I **finished** my homework yesterday.*`
  },
  'Present Perfect Continuous': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + have/has + been + V-ing\n- **Phủ định:** S + have/has + not + been + V-ing\n- **Nghi vấn:** Have/Has + S + been + V-ing?\n\n### 2. Cách dùng (Usage)\n- Nhấn mạnh tính liên tục của hành động bắt đầu trong quá khứ, kéo dài đến hiện tại.\n- Hành động vừa mới kết thúc và để lại kết quả có thể thấy ở hiện tại.\n\n### 3. Ví dụ (Examples)\n- *IELTS Speaking:* "I'm a bit tired because I'**ve been studying** for my exam all night." (Nhấn mạnh sự liên tục và kết quả là 'mệt')\n- *Giao tiếp:* "Why are your clothes so dirty?" - "I'**ve been gardening**."\n\n### 4. So sánh với thì khác\n- **HTHT tiếp diễn vs. HT hoàn thành:** HTHTTD nhấn mạnh quá trình, HTHT nhấn mạnh kết quả.\n  - *I'**ve been reading** that book.* (Tôi đang đọc nó, chưa xong)\n  - *I'**ve read** that book.* (Tôi đã đọc xong nó)\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Thường đi với 'for', 'since', 'all day', 'all morning' để nhấn mạnh khoảng thời gian.\n- **Lỗi sai:** Dùng với các động từ chỉ trạng thái. *Sai: I'**ve been knowing** him for years.* -> *Đúng: I'**ve known** him for years.*`
  },
  'Simple Past': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + V2/ed\n- **Phủ định:** S + did + not + V(bare)\n- **Nghi vấn:** Did + S + V(bare)?\n\n### 2. Cách dùng (Usage)\n- Hành động đã xảy ra và chấm dứt hoàn toàn trong quá khứ, có thời gian xác định.\n- Một chuỗi các hành động xảy ra liên tiếp trong quá khứ.\n- Thói quen trong quá khứ (thường dùng với 'used to').\n\n### 3. Ví dụ (Examples)\n- *IELTS Writing Task 2:* "In the 20th century, technological advancements **revolutionized** the communication industry."\n- *Giao tiếp (Chuỗi hành động):* "Yesterday, I **woke up**, **had** breakfast, and **went** to work."\n\n### 4. So sánh với thì khác\n- **Quá khứ đơn vs. Hiện tại hoàn thành:** QKĐ dùng cho hành động đã chấm dứt, có thời gian cụ thể. HTHT dùng cho hành động có liên quan đến hiện tại, không rõ thời gian.\n  - *He **lived** in London for 5 years.* (Bây giờ anh ấy không sống ở đó nữa)\n  - *He **has lived** in London for 5 years.* (Anh ấy vẫn đang sống ở đó)\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Dấu hiệu là các trạng từ chỉ thời gian quá khứ: 'yesterday', 'last week', 'in 1999', 'ago'.\n- **Lỗi sai:** Dùng động từ quá khứ sau trợ động từ 'did'. *Sai: I **didn't went** to the party.* -> *Đúng: I **didn't go** to the party.*`
  },
  'Past Continuous': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + was/were + V-ing\n- **Phủ định:** S + was/were + not + V-ing\n- **Nghi vấn:** Was/Were + S + V-ing?\n\n### 2. Cách dùng (Usage)\n- Hành động đang xảy ra tại một thời điểm cụ thể trong quá khứ.\n- Một hành động đang xảy ra (QKTD) thì một hành động khác xen vào (QKĐ).\n- Hai hành động xảy ra đồng thời trong quá khứ (thường nối bằng 'while').\n\n### 3. Ví dụ (Examples)\n- *IELTS Speaking:* "I remember it clearly. At this time last year, I **was preparing** for my final exams."\n- *Giao tiếp (Hành động xen vào):* "I **was watching** TV when the phone **rang**."\n- *Giao tiếp (Hành động song song):* "While my mom **was cooking**, I **was doing** my homework."\n\n### 4. So sánh với thì khác\n- **Quá khứ tiếp diễn vs. Quá khứ đơn:** QKTD mô tả bối cảnh, hành động nền. QKĐ mô tả hành động chính, ngắn gọn xen vào.\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Cấu trúc kinh điển: \`When + S + V(QKĐ), S + was/were + V-ing\` và \`While + S + was/were + V-ing, S + V(QKĐ)\`.\n- **Lỗi sai:** Nhầm lẫn giữa 'was' (số ít) và 'were' (số nhiều và 'you'). *Sai: You **was** studying.* -> *Đúng: You **were** studying.*`
  },
  'Past Perfect': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + had + V3/ed\n- **Phủ định:** S + had + not + V3/ed\n- **Nghi vấn:** Had + S + V3/ed?\n\n### 2. Cách dùng (Usage)\n- Diễn tả một hành động đã xảy ra và hoàn tất trước một hành động khác hoặc một thời điểm khác trong quá khứ.\n\n### 3. Ví dụ (Examples)\n- *IELTS Writing:* "By the time the new regulations were introduced, many companies **had** already **moved** their factories overseas."\n- *Giao tiếp:* "When I arrived at the station, the train **had** already **left**."\n\n### 4. So sánh với thì khác\n- **Quá khứ hoàn thành vs. Quá khứ đơn:** QKHT là thì "quá khứ của quá khứ". Nó xảy ra trước một hành động QKĐ khác.\n  - *He **told** me he **had lost** his wallet.* (Việc 'mất ví' xảy ra trước việc 'kể')\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Nhớ công thức với 'before' và 'after': \`S + V(QKĐ) + before + S + had + V3/ed\` và \`After + S + had + V3/ed, S + V(QKĐ)\`.\n- **Lỗi sai:** Lạm dụng khi không cần thiết. Nếu các hành động xảy ra theo trình tự thời gian, chỉ cần dùng QKĐ. *Sai: I **had woken up** and **had had** breakfast.* -> *Đúng: I **woke up** and **had** breakfast.*`
  },
  'Past Perfect Continuous': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + had + been + V-ing\n- **Phủ định:** S + had + not + been + V-ing\n- **Nghi vấn:** Had + S + been + V-ing?\n\n### 2. Cách dùng (Usage)\n- Nhấn mạnh tính liên tục của một hành động đã xảy ra kéo dài trước một hành động khác trong quá khứ.\n\n### 3. Ví dụ (Examples)\n- *IELTS Speaking:* "My eyes were sore because I **had been reading** for five hours before I went to bed."\n- *Giao tiếp:* "They **had been waiting** for an hour before the bus finally arrived."\n\n### 4. So sánh với thì khác\n- **QKHT tiếp diễn vs. QK hoàn thành:** Tương tự cặp HTHT, QKHTTD nhấn mạnh quá trình, QKHT nhấn mạnh sự hoàn tất.\n  - *He was tired because he **had been running**.* (Nhấn mạnh việc chạy)\n  - *He **had run** 5km before he felt tired.* (Nhấn mạnh kết quả là đã chạy được 5km)\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Dùng để giải thích nguyên nhân cho một tình trạng hoặc sự việc trong quá khứ.\n- **Lỗi sai:** Tương tự các thì tiếp diễn khác, không dùng với động từ trạng thái.`
  },
  'Simple Future': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + will + V(bare)\n- **Phủ định:** S + will + not (won't) + V(bare)\n- **Nghi vấn:** Will + S + V(bare)?\n\n### 2. Cách dùng (Usage)\n- Quyết định tức thời tại thời điểm nói.\n- Đưa ra lời hứa, lời đề nghị, lời yêu cầu.\n- Dự đoán không có căn cứ chắc chắn.\n\n### 3. Ví dụ (Examples)\n- *IELTS Speaking:* "In the future, I think more people **will work** from home due to advancements in technology." (Dự đoán)\n- *Giao tiếp (Quyết định tức thời):* "It's cold in here. I'**ll close** the window."\n- *Giao tiếp (Lời hứa):* "I promise I **will call** you tonight."\n\n### 4. So sánh với thì khác\n- **Tương lai đơn vs. Be going to:** 'Will' dùng cho quyết định tức thời, dự đoán không căn cứ. 'Be going to' dùng cho kế hoạch đã có từ trước, dự đoán có căn cứ.\n  - *Look at those dark clouds! It'**s going to rain**.* (Có căn cứ)\n  - *I think it **will rain** tomorrow.* (Không có căn cứ)\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** 'Will' thường đi với các cụm từ như 'I think', 'I guess', 'I promise', 'probably'.\n- **Lỗi sai:** Dùng 'will' cho kế hoạch đã định sẵn. *Sai: I **will visit** my aunt this weekend. I already bought the tickets.* -> *Đúng: I **am going to visit**...* hoặc *I **am visiting**...*`
  },
  'Future Continuous': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + will + be + V-ing\n- **Phủ định:** S + will + not + be + V-ing\n- **Nghi vấn:** Will + S + be + V-ing?\n\n### 2. Cách dùng (Usage)\n- Một hành động sẽ đang diễn ra tại một thời điểm cụ thể trong tương lai.\n\n### 3. Ví dụ (Examples)\n- *IELTS Speaking:* "It's hard to say for sure, but I imagine that in 20 years, we **will be using** flying cars."\n- *Giao tiếp:* "Don't call me at 8 PM tonight. I **will be having** dinner with my family."\n\n### 4. So sánh với thì khác\n- **TL tiếp diễn vs. TL đơn:** TLTD mô tả một hành động kéo dài tại một điểm thời gian tương lai, trong khi TLĐ chỉ nói về một hành động sẽ xảy ra.\n  - *At 9 AM tomorrow, I **will be taking** my exam.* (Hành động 'làm bài thi' đang diễn ra lúc 9h)\n  - *The exam **will start** at 9 AM tomorrow.* (Hành động 'bắt đầu' xảy ra lúc 9h)\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Cấu trúc thường gặp là: \`At + [giờ] + [thời gian tương lai], S + will be + V-ing\`.\n- **Lỗi sai:** Dùng cho dự đoán chung chung không có thời gian cụ thể.`
  },
  'Future Perfect': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + will + have + V3/ed\n- **Phủ định:** S + will + not + have + V3/ed\n- **Nghi vấn:** Will + S + have + V3/ed?\n\n### 2. Cách dùng (Usage)\n- Một hành động sẽ hoàn tất trước một thời điểm hoặc một hành động khác trong tương lai.\n\n### 3. Ví dụ (Examples)\n- *IELTS Writing:* "By 2050, scientists predict that we **will have found** solutions to many current environmental problems."\n- *Giao tiếp:* "By the time you arrive, I **will have finished** my homework."\n\n### 4. So sánh với thì khác\n- **TL hoàn thành vs. TL đơn:** TLHT nhấn mạnh sự hoàn tất của hành động trước một mốc thời gian tương lai.\n  - *I **will finish** the report.* (Sẽ hoàn thành, không rõ khi nào)\n  - *I **will have finished** the report by 5 PM.* (Chắc chắn xong trước 5h)\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Dấu hiệu nhận biết là các cụm từ \`by + [thời gian tương lai]\` hoặc \`by the time + [mệnh đề hiện tại đơn]\`.\n- **Lỗi sai:** Dùng mệnh đề tương lai sau 'by the time'. *Sai: By the time you **will arrive**...* -> *Đúng: By the time you **arrive**...*`
  },
  'Future Perfect Continuous': {
    content: `### 1. Cấu trúc (Structure)\n- **Khẳng định:** S + will + have + been + V-ing\n- **Phủ định:** S + will + not + have + been + V-ing\n- **Nghi vấn:** Will + S + have + been + V-ing?\n\n### 2. Cách dùng (Usage)\n- Nhấn mạnh tính liên tục của một hành động kéo dài đến một thời điểm nào đó trong tương lai.\n\n### 3. Ví dụ (Examples)\n- *IELTS Speaking:* "By the end of this year, I **will have been working** at this company for a decade."\n- *Giao tiếp:* "Next month, we **will have been living** in this house for three years."\n\n### 4. So sánh với thì khác\n- **TLHT tiếp diễn vs. TL hoàn thành:** TLHTTD nhấn mạnh khoảng thời gian hành động diễn ra. TLHT nhấn mạnh sự hoàn tất.\n  - *By 6 PM, I **will have been cooking** for two hours.* (Nhấn mạnh quá trình nấu 2 tiếng)\n  - *By 6 PM, I **will have cooked** dinner.* (Nhấn mạnh kết quả là bữa tối đã xong)\n\n### 5. Mẹo ghi nhớ và lỗi thường gặp\n- **Mẹo:** Thường dùng để tính toán một hành động đã kéo dài bao lâu tính đến một mốc thời gian trong tương lai.\n- **Lỗi sai:** Rất ít phổ biến trong giao tiếp hàng ngày, chủ yếu dùng trong các ngữ cảnh cần sự trang trọng hoặc chính xác cao.`
  }
};

/**
 * Get all tenses
 */
exports.getTenses = async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's grammar progress
    const userProgress = await Grammar.find({ userId });

    const tenseList = Object.keys(TENSE_DETAILS);

    const result = tenseList.map(tenseName => {
      const progress = userProgress.find(t => t.tenseName === tenseName);
      return {
        tenseName,
        progress: progress?.progress || 0,
        completed: progress?.completed || false,
        exercisesCompleted: progress?.exercisesAttempted || 0
      };
    });

    res.json({
      success: true,
      tenses: result
    });
  } catch (error) {
    console.error('Get tenses error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get tense details
 */
exports.getTenseDetails = async (req, res) => {
  try {
    const { tenseName } = req.params;

    const tenseInfo = TENSE_DETAILS[tenseName];
    if (!tenseInfo) {
      return res.status(404).json({
        success: false,
        message: 'Tense not found'
      });
    }

    // Get user's progress for this tense
    const userId = req.userId;
    const progress = await Grammar.findOne({ userId, tenseName });

    res.json({
      success: true,
      tense: {
        name: tenseName,
        content: tenseInfo.content,
        progress: progress?.progress || 0,
        exercisesAttempted: progress?.exercisesAttempted || 0,
        exercisesCorrect: progress?.exercisesCorrect || 0
      }
    });
  } catch (error) {
    console.error('Get tense details error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get grammar progress
 */
exports.getProgress = async (req, res) => {
  try {
    const userId = req.userId;

    const progress = await Grammar.find({ userId });

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Submit grammar exercise
 */
exports.submitExercise = async (req, res) => {
  try {
    const { tenseName, answers } = req.body;
    const userId = req.userId;

    if (!tenseName || !answers) {
      return res.status(400).json({
        success: false,
        message: 'Tense name and answers are required'
      });
    }

    // Simple scoring - in production, use more sophisticated logic
    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalCount = answers.length;
    const score = Math.round((correctCount / totalCount) * 100);

    // Find or create grammar record
    let grammar = await Grammar.findOne({ userId, tenseName });
    if (!grammar) {
      grammar = new Grammar({ userId, tenseName });
    }

    grammar.exercisesAttempted += 1;
    grammar.exercisesCorrect += correctCount;

    // Update progress
    // Update progress
    // Assume 15 questions per exercise on average (as per generateGrammarExercises)
    // Capping at 100 to avoid validation error
    if (grammar.exercisesAttempted > 0) {
      const p = Math.round(
        (grammar.exercisesCorrect / (grammar.exercisesAttempted * 15)) * 100
      );
      grammar.progress = p > 100 ? 100 : p;
    }

    // Mark as completed if progress reaches 80%
    if (grammar.progress >= 80) {
      grammar.completed = true;
      grammar.completedAt = new Date();
    }

    await grammar.save();

    res.json({
      success: true,
      message: 'Exercise submitted successfully',
      score,
      correctCount,
      totalCount,
      progress: grammar.progress
    });
  } catch (error) {
    console.error('Submit exercise error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Mark tense as completed
 */
exports.completeTense = async (req, res) => {
  try {
    const { tenseName } = req.body;
    const userId = req.userId;

    if (!tenseName) {
      return res.status(400).json({
        success: false,
        message: 'Tense name is required'
      });
    }

    let grammar = await Grammar.findOne({ userId, tenseName });
    if (!grammar) {
      grammar = new Grammar({ userId, tenseName });
    }

    grammar.completed = true;
    grammar.completedAt = new Date();
    grammar.progress = 100;

    await grammar.save();

    res.json({
      success: true,
      message: 'Tense marked as completed',
      tense: grammar
    });
  } catch (error) {
    console.error('Complete tense error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate exercises for a specific tense
 */
exports.generateExercises = async (req, res) => {
  try {
    const { tenseName } = req.body;

    if (!tenseName) {
      return res.status(400).json({
        success: false,
        message: 'Tense name is required'
      });
    }

    const ChatbotService = require('../services/chatbotService');
    const exercises = await ChatbotService.generateGrammarExercises(tenseName, 15);

    res.json({
      success: true,
      exercises
    });
  } catch (error) {
    console.error('Generate exercises error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
