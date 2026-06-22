// AI Knowledge Extraction and Question Generation Engine

const AIEngine = {
  // --- KNOWLEDGE EXTRACTION ---
  
  // Simulates or extracts topics from document text
  extractTopics(fileName, fileText = "") {
    const topicsMap = {
      // Machine Learning
      "linear regression": "Linear Regression & Gradient Descent",
      "logistic regression": "Logistic Regression & Sigmoid Function",
      "decision tree": "Decision Trees (ID3, C4.5, Gini Index)",
      "random forest": "Ensemble Learning & Random Forests",
      "support vector machine": "Support Vector Machines (SVM) & Kernel Tricks",
      "neural network": "Artificial Neural Networks & Backpropagation",
      "k-means": "Clustering Algorithms (K-Means, Hierarchical)",
      "knn": "K-Nearest Neighbors (KNN) Instance-based Learning",
      "deep learning": "Deep Learning & Convolutional Networks",
      "bias variance": "Bias-Variance Trade-off & Regularization",
      "overfitting": "Model Evaluation, Overfitting & Cross-Validation",
      "naive bayes": "Bayesian Learning & Naive Bayes Classifier",
      "pca": "Dimensionality Reduction & Principal Component Analysis (PCA)",
      
      // DBMS
      "normalization": "Database Normalization (1NF, 2NF, 3NF, BCNF)",
      "sql": "SQL Queries, Joins, and Subqueries",
      "transaction": "ACID Properties & Transaction Management",
      "indexing": "Indexing & B/B+ Tree Data Structures",
      
      // OS
      "process scheduling": "CPU Scheduling Algorithms",
      "deadlock": "Deadlock Detection, Prevention & Banker's Algorithm",
      "virtual memory": "Paging, Segmentation & Page Replacement Algorithms",
      "semaphore": "Process Synchronization & Semaphores"
    };

    const foundTopics = new Set();
    const cleanText = (fileName + " " + fileText).toLowerCase();

    // Check keywords in text
    for (const [keyword, topicName] of Object.entries(topicsMap)) {
      if (cleanText.includes(keyword)) {
        foundTopics.add(topicName);
      }
    }

    // Default fallbacks based on subjects if nothing detected
    if (foundTopics.size === 0) {
      if (cleanText.includes("ml") || cleanText.includes("machine learning")) {
        return [
          "Linear Regression & Gradient Descent",
          "Logistic Regression & Sigmoid Function",
          "Decision Trees (ID3, Gini Index)",
          "Support Vector Machines (SVM)",
          "Ensemble Learning & Random Forests",
          "K-Means Clustering & PCA"
        ];
      } else if (cleanText.includes("dbms") || cleanText.includes("database")) {
        return [
          "Relational Model & Keys",
          "SQL Queries, Joins & Views",
          "Database Normalization (1NF, 2NF, 3NF)",
          "Transaction Isolation & ACID Properties",
          "Indexing & Query Optimization"
        ];
      } else if (cleanText.includes("os") || cleanText.includes("operating system")) {
        return [
          "Processes, Threads & CPU Scheduling",
          "Process Synchronization & Semaphores",
          "Deadlock Prevention & Avoidance",
          "Memory Management & Virtual Memory",
          "File Systems & Disk Scheduling"
        ];
      } else {
        // Generic fallback topics based on file name
        const baseName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        return [
          `${baseName} Core Concepts`,
          `${baseName} Methodologies`,
          `${baseName} Applications & Analysis`,
          `${baseName} Advanced Systems`
        ];
      }
    }

    return Array.from(foundTopics);
  },

  // --- GEMINI API GENERATOR ---

  async generateWithGemini(config, subjectName, subjectCode, semester, topics, examType, totalMarks, modelNumber, markingScheme, choiceStructure) {
    const apiKey = CONFIG.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes("your-gemini-api-key")) {
      throw new Error("Gemini API key is not configured.");
    }

    const isUnitTest = examType === "unit_test";
    const prompt = `
You are an expert university professor designing a final assessment. 
Generate a high-quality, academically rigorous question paper for:
- Subject: ${subjectName} (${subjectCode})
- Semester: ${semester}
- Exam Type: ${isUnitTest ? "Unit Test" : "Semester Examination"}
- Total Marks: ${totalMarks} marks
- Model Number: ${modelNumber}
- Topics to cover: ${topics.join(", ")}
- Marking Scheme configuration: ${markingScheme}
- Choice Structure details: ${JSON.stringify(choiceStructure)}

Rules:
1. Coverage: Distribute questions evenly across the provided topics. No single topic should dominate.
2. Difficulty Balance: Balanced distribution of Easy (30%), Medium (50%), and Hard (20%) questions.
3. Choice Similarity: For questions grouped under an "OR" or choice group, the alternative options must cover similar difficulty levels, target similar learning outcomes (e.g. both theoretical or both numerical), and require similar time/marks weight.
4. Language: Formulate clear, professional, unambiguous academic questions. Include sub-parts (e.g. a, b) if suitable for large mark distributions.
5. Structure requirements:
   - For Unit Test (20 Marks) with marking scheme "${markingScheme}" (e.g. 8+7+5):
     - Question 1 must have 2 options of 8 marks (Q1A or Q1B).
     - Question 2 must have 2 options of 7 marks (Q2A or Q2B).
     - Question 3 must have 2 options of 5 marks (Q3A or Q3B).
   - For Semester Exam (60 Marks):
     - Generate the number of questions and choice types requested in the choiceStructure parameter:
       - Choice type "one_out_of_two": Question has Q(N)A OR Q(N)B (student answers 1).
       - Choice type "two_out_of_three": Question has Q(N)A, Q(N)B, Q(N)C (student answers 2).
       - Choice type "one_out_of_three": Question has Q(N)A, Q(N)B, Q(N)C (student answers 1).
       - Choice type "none": Single mandatory question.

Return ONLY a valid JSON object. Do not include markdown code block formatting (\`\`\`json ... \`\`\`), do not write any introductory or concluding text. The output must be strictly parsable as JSON and match the following structure:
{
  "title": "Subject Name Exam Title",
  "subject_code": "${subjectCode}",
  "semester": "${semester}",
  "total_marks": ${totalMarks},
  "instructions": [
    "All questions are compulsory.",
    "Draw neat diagrams wherever necessary."
  ],
  "questions": [
    {
      "id": "q1",
      "question_number": "1",
      "marks_per_option": 8, 
      "type": "choice_or", // choice_or (1 out of 2), choice_any_two (2 out of 3), choice_any_one (1 out of 3), single (no choice)
      "choice_text": "Answer any one of the following", // Help text like "Answer Q1A OR Q1B" or "Answer any two"
      "options": [
        {
          "option_letter": "A",
          "text": "Question text here...",
          "topic": "Specific Topic",
          "difficulty": "Medium",
          "marks": 8
        },
        {
          "option_letter": "B",
          "text": "Alternative question text here...",
          "topic": "Specific Topic",
          "difficulty": "Medium",
          "marks": 8
        }
      ]
    }
  ]
}
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Failed to query Gemini API.");
    }

    const resData = await response.json();
    const textResponse = resData.candidates[0].content.parts[0].text;
    
    try {
      // Clean up response if it contains backticks
      let cleanJson = textResponse.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "");
      }
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", textResponse);
      throw new Error("AI returned invalid JSON structure. Retrying or fallback suggested.");
    }
  },

  // --- LOCAL FALLBACK GENERATOR (MACHINE LEARNING) ---

  // Database of Machine Learning questions
  mlQuestionDatabase: {
    // 5 Marks Questions
    5: [
      { text: "Define Supervised, Unsupervised, and Reinforcement Learning with one example of each.", topic: "Introduction to Machine Learning", difficulty: "Easy" },
      { text: "Explain the concept of Bias-Variance Trade-off in machine learning.", topic: "Model Evaluation & Regularization", difficulty: "Medium" },
      { text: "What is Overfitting? List three techniques to prevent overfitting in Machine Learning models.", topic: "Model Evaluation & Regularization", difficulty: "Easy" },
      { text: "Explain the difference between L1 (Lasso) and L2 (Ridge) regularization methods.", topic: "Model Evaluation & Regularization", difficulty: "Medium" },
      { text: "State the Bayes' theorem and describe its significance in Machine Learning.", topic: "Bayesian Learning", difficulty: "Easy" },
      { text: "Explain Confusion Matrix. Define Precision, Recall, and F1-score.", topic: "Model Evaluation & Regularization", difficulty: "Easy" },
      { text: "Describe the concept of 'Margin' in Support Vector Machines.", topic: "Support Vector Machines (SVM)", difficulty: "Medium" },
      { text: "Explain the basic steps of the K-Nearest Neighbors (KNN) algorithm.", topic: "Instance-based Learning", difficulty: "Easy" },
      { text: "What is Curse of Dimensionality? Why is it a problem for distance-based algorithms?", topic: "Introduction to Machine Learning", difficulty: "Medium" },
      { text: "Explain the difference between Bagging and Boosting ensemble techniques.", topic: "Ensemble Learning", difficulty: "Medium" }
    ],
    // 7 Marks Questions
    7: [
      { text: "Describe the K-Means Clustering algorithm. Explain how the optimal value of 'K' is determined using the Elbow Method.", topic: "Clustering Algorithms", difficulty: "Medium" },
      { text: "Explain Logistic Regression. Why is it used for classification despite having 'Regression' in its name? Derive the Sigmoid function.", topic: "Logistic Regression", difficulty: "Medium" },
      { text: "Compare and contrast Decision Trees, Random Forests, and Gradient Boosted Trees.", topic: "Ensemble Learning", difficulty: "Medium" },
      { text: "Explain the Perceptron learning model. Draw its architecture and specify its limitation (the XOR problem).", topic: "Neural Networks", difficulty: "Easy" },
      { text: "Explain Principal Component Analysis (PCA) step-by-step for dimensionality reduction.", topic: "Dimensionality Reduction", difficulty: "Hard" },
      { text: "Describe the Naive Bayes Classifier. Why is the 'Naive' assumption made, and what are its practical implications?", topic: "Bayesian Learning", difficulty: "Medium" },
      { text: "Explain the concept of Support Vector Machines. What are kernel tricks, and how do they help in dealing with non-linear data?", topic: "Support Vector Machines (SVM)", difficulty: "Hard" },
      { text: "Given the dataset: [2, 4, 10, 12, 3, 20, 30, 11, 25]. Manually trace K-Means clustering for K=2 for two iterations, choosing initial centroids as 2 and 4.", topic: "Clustering Algorithms", difficulty: "Hard" }
    ],
    // 8 Marks Questions
    8: [
      { text: "Explain Linear Regression with one independent variable. Derive the gradient descent update rules for minimizing the Mean Squared Error cost function.", topic: "Linear Regression", difficulty: "Medium" },
      { text: "Construct a Decision Tree using ID3 algorithm. Calculate the Information Gain and Entropy for a dataset with 9 Positive and 5 Negative samples, partitioned on a boolean feature containing 6 Positive/2 Negative and 3 Positive/3 Negative splits.", topic: "Decision Trees", difficulty: "Hard" },
      { text: "Explain the architecture of a Multi-Layer Perceptron (MLP). Derive the mathematical updates for the backpropagation algorithm for a single hidden layer.", topic: "Neural Networks", difficulty: "Hard" },
      { text: "Discuss Support Vector Machines. Formulate the primal and dual optimization problems for soft-margin classification, explaining the role of Slack Variables (xi) and Regularization Parameter (C).", topic: "Support Vector Machines (SVM)", difficulty: "Hard" },
      { text: "Explain Random Forest classifier. Detail how bagging and random feature selection reduce variance and prevent overfitting compared to individual decision trees.", topic: "Ensemble Learning", difficulty: "Medium" },
      { text: "Explain Gradient Descent. Compare Batch, Stochastic (SGD), and Mini-batch Gradient Descent algorithms on convergence speed and computational efficiency.", topic: "Linear Regression", difficulty: "Medium" }
    ],
    // 10 Marks Questions
    10: [
      { text: "Detail the Backpropagation algorithm in Artificial Neural Networks. Derive the equations for weight updates for output nodes and hidden nodes step-by-step using the chain rule.", topic: "Neural Networks", difficulty: "Hard" },
      { text: "Explain Principal Component Analysis (PCA). Outline the covariance matrix computation, eigen-decomposition, and projection steps. Calculate the covariance matrix for a 2D dataset: (1,1), (2,3), (4,2).", topic: "Dimensionality Reduction", difficulty: "Hard" },
      { text: "Explain Decision Tree induction. How does ID3 differ from C4.5 and CART? Explain pruning techniques (Pre-pruning and Post-pruning) to resolve overfitting.", topic: "Decision Trees", difficulty: "Medium" },
      { text: "Discuss Clustering. Explain K-Means and Hierarchical Clustering (Agglomerative & Divisive). What is a Dendrogram, and how is it used to cut clusters?", topic: "Clustering Algorithms", difficulty: "Medium" }
    ],
    // 12 Marks Questions
    12: [
      { text: "Discuss Linear and Logistic Regression. (a) Derive the Normal Equation for Linear Regression. (6 Marks) (b) Write the binary cross-entropy loss function for Logistic Regression and explain its gradient descent updates. (6 Marks)", topic: "Regression Analysis", difficulty: "Hard" },
      { text: "Detail Support Vector Machines. (a) Formulate the optimization problem for Hard-Margin SVM. (6 Marks) (b) Explain kernel functions: Linear, Polynomial, and Radial Basis Function (RBF), detailing how they project data into infinite-dimensional spaces. (6 Marks)", topic: "Support Vector Machines (SVM)", difficulty: "Hard" },
      { text: "Detail Ensemble Methods. (a) Explain how AdaBoost iteratively adjusts sample weights and combines weak classifiers. (6 Marks) (b) Compare Random Forest and XGBoost in terms of architecture, speed, and optimization. (6 Marks)", topic: "Ensemble Learning", difficulty: "Hard" }
    ]
  },

  // Generates a mock paper for custom subjects (not ML) when Gemini is unavailable
  generateCustomSubjectTemplate(subjectName, subjectCode, semester, examType, totalMarks, markingSchemeStr, choiceStructure) {
    const isUnitTest = examType === "unit_test";
    const marksList = markingSchemeStr.split("+").map(x => parseInt(x.trim()));
    
    const instructions = [
      "All questions are compulsory.",
      "Draw neat diagrams and schematics wherever necessary.",
      "Write subject code and semester details clearly on the answer sheet."
    ];

    const questions = [];
    
    if (isUnitTest) {
      // Unit test: usually 3 questions matching marksList
      marksList.forEach((marks, idx) => {
        const qNum = idx + 1;
        questions.push({
          id: `q${qNum}`,
          question_number: String(qNum),
          marks_per_option: marks,
          type: "choice_or",
          choice_text: `Answer Q${qNum}A OR Q${qNum}B`,
          options: [
            {
              option_letter: "A",
              text: `[Theory/Definition] Detailed question on ${subjectName} Core Topic (Part A) related to Unit ${idx+1}. Discuss its architecture and applications.`,
              topic: `Unit ${idx+1} Concept`,
              difficulty: "Medium",
              marks: marks
            },
            {
              option_letter: "B",
              text: `[Analytical/Numerical] Explain the methodology behind ${subjectName} Topic (Part B). Formulate the equations and outline steps with a flowchart.`,
              topic: `Unit ${idx+1} Concept`,
              difficulty: "Medium",
              marks: marks
            }
          ]
        });
      });
    } else {
      // Semester Exam: based on choiceStructure or default layout
      const questionCount = choiceStructure.numQuestions || 5;
      const questionMarks = choiceStructure.marksPerQuestion || 12;
      const choiceType = choiceStructure.choiceType || "one_out_of_two";

      for (let i = 1; i <= questionCount; i++) {
        const options = [];
        let type = "choice_or";
        let choiceText = `Answer Q${i}A OR Q${i}B`;

        if (choiceType === "one_out_of_two") {
          options.push(
            { option_letter: "A", text: `Explain the fundamental architecture and working mechanism of ${subjectName} Core Concept ${i}. Support with a neat diagram.`, topic: `Module ${i} Core`, difficulty: "Medium", marks: questionMarks },
            { option_letter: "B", text: `Analyze the performance of ${subjectName} Concept ${i}. Discuss its limitations, practical challenges, and optimization solutions.`, topic: `Module ${i} Advanced`, difficulty: "Medium", marks: questionMarks }
          );
        } else if (choiceType === "two_out_of_three") {
          type = "choice_any_two";
          choiceText = `Answer any two of the following (each carries ${questionMarks/2} marks)`;
          options.push(
            { option_letter: "A", text: `Define and explain ${subjectName} Topic ${i} (Section A) with real-world applications.`, topic: `Module ${i} Intro`, difficulty: "Easy", marks: questionMarks/2 },
            { option_letter: "B", text: `Illustrate the step-by-step algorithms used in ${subjectName} System ${i} (Section B).`, topic: `Module ${i} Operations`, difficulty: "Medium", marks: questionMarks/2 },
            { option_letter: "C", text: `Discuss the comparative tradeoffs of implementing ${subjectName} Protocol ${i} (Section C).`, topic: `Module ${i} Design`, difficulty: "Hard", marks: questionMarks/2 }
          );
        } else if (choiceType === "one_out_of_three") {
          type = "choice_any_one";
          choiceText = `Answer any one of the following`;
          options.push(
            { option_letter: "A", text: `Provide a detailed exposition on ${subjectName} Architecture ${i}. Discuss deployment and constraints.`, topic: `Module ${i} Architecture`, difficulty: "Medium", marks: questionMarks },
            { option_letter: "B", text: `Derive the mathematical equations and logic backing ${subjectName} Model ${i}.`, topic: `Module ${i} Mathematics`, difficulty: "Hard", marks: questionMarks },
            { option_letter: "C", text: `Write detailed notes on: (i) ${subjectName} Subtopic ${i}.1 (ii) ${subjectName} Subtopic ${i}.2.`, topic: `Module ${i} Notes`, difficulty: "Easy", marks: questionMarks }
          );
        } else {
          // No choice
          type = "single";
          choiceText = "Mandatory Question";
          options.push(
            { option_letter: "A", text: `Explain in detail the concept of ${subjectName} Framework ${i}. Discuss design principles, implementation strategies, and compile a comparative table.`, topic: `Module ${i} Unified`, difficulty: "Hard", marks: questionMarks }
          );
        }

        questions.push({
          id: `q${i}`,
          question_number: String(i),
          marks_per_option: questionMarks,
          type,
          choice_text: choiceText,
          options
        });
      }
    }

    return {
      title: `${subjectName} ${isUnitTest ? "Unit Test" : "Semester Examination"}`,
      subject_code: subjectCode,
      semester: semester,
      total_marks: totalMarks,
      instructions: instructions,
      questions: questions,
      isTemplate: true // flag to show prompt in UI to add API key
    };
  },

  // Generates a local paper using ML database
  generateLocalMLPaper(examType, totalMarks, markingSchemeStr, choiceStructure) {
    const isUnitTest = examType === "unit_test";
    const questions = [];
    const instructions = [
      "All questions are compulsory.",
      "Draw neat diagrams wherever necessary.",
      "Support answers with mathematical formulations and examples."
    ];

    if (isUnitTest) {
      const marksList = markingSchemeStr.split("+").map(x => parseInt(x.trim()));
      
      marksList.forEach((marks, idx) => {
        const qNum = idx + 1;
        // Fetch questions of this mark size
        const qPool = this.mlQuestionDatabase[marks] || this.mlQuestionDatabase[5]; // fallback to 5 marks
        // Randomly pick two distinct questions for Option A and B
        const shuffled = [...qPool].sort(() => 0.5 - Math.random());
        const qA = shuffled[0];
        const qB = shuffled[1] || shuffled[0];

        questions.push({
          id: `q${qNum}`,
          question_number: String(qNum),
          marks_per_option: marks,
          type: "choice_or",
          choice_text: `Answer Q${qNum}A OR Q${qNum}B`,
          options: [
            {
              option_letter: "A",
              text: qA.text,
              topic: qA.topic,
              difficulty: qA.difficulty,
              marks: marks
            },
            {
              option_letter: "B",
              text: qB.text,
              topic: qB.topic,
              difficulty: qB.difficulty,
              marks: marks
            }
          ]
        });
      });
    } else {
      // Semester exam
      const questionCount = choiceStructure.numQuestions || 5;
      const questionMarks = choiceStructure.marksPerQuestion || 12;
      const choiceType = choiceStructure.choiceType || "one_out_of_two";

      for (let i = 1; i <= questionCount; i++) {
        let type = "choice_or";
        let choiceText = `Answer Q${i}A OR Q${i}B`;
        const options = [];

        if (choiceType === "one_out_of_two") {
          const qPool = this.mlQuestionDatabase[questionMarks] || this.mlQuestionDatabase[10]; // fallback
          const shuffled = [...qPool].sort(() => 0.5 - Math.random());
          const qA = shuffled[0];
          const qB = shuffled[1] || shuffled[0];
          
          options.push(
            { option_letter: "A", text: qA.text, topic: qA.topic, difficulty: qA.difficulty, marks: questionMarks },
            { option_letter: "B", text: qB.text, topic: qB.topic, difficulty: qB.difficulty, marks: questionMarks }
          );
        } else if (choiceType === "two_out_of_three") {
          type = "choice_any_two";
          choiceText = `Answer any two of the following (each carries ${questionMarks/2} marks)`;
          // Need 3 questions of half marks
          const halfMarks = Math.floor(questionMarks / 2);
          const qPool = this.mlQuestionDatabase[halfMarks] || this.mlQuestionDatabase[5];
          const shuffled = [...qPool].sort(() => 0.5 - Math.random());
          
          options.push(
            { option_letter: "A", text: shuffled[0].text, topic: shuffled[0].topic, difficulty: shuffled[0].difficulty, marks: halfMarks },
            { option_letter: "B", text: shuffled[1].text, topic: shuffled[1].topic, difficulty: shuffled[1].difficulty, marks: halfMarks },
            { option_letter: "C", text: (shuffled[2] || shuffled[0]).text, topic: (shuffled[2] || shuffled[0]).topic, difficulty: (shuffled[2] || shuffled[0]).difficulty, marks: halfMarks }
          );
        } else if (choiceType === "one_out_of_three") {
          type = "choice_any_one";
          choiceText = `Answer any one of the following`;
          const qPool = this.mlQuestionDatabase[questionMarks] || this.mlQuestionDatabase[10];
          const shuffled = [...qPool].sort(() => 0.5 - Math.random());
          
          options.push(
            { option_letter: "A", text: shuffled[0].text, topic: shuffled[0].topic, difficulty: shuffled[0].difficulty, marks: questionMarks },
            { option_letter: "B", text: shuffled[1].text, topic: shuffled[1].topic, difficulty: shuffled[1].difficulty, marks: questionMarks },
            { option_letter: "C", text: (shuffled[2] || shuffled[0]).text, topic: (shuffled[2] || shuffled[0]).topic, difficulty: (shuffled[2] || shuffled[0]).difficulty, marks: questionMarks }
          );
        } else {
          // single question
          type = "single";
          choiceText = "Mandatory Question";
          const qPool = this.mlQuestionDatabase[questionMarks] || this.mlQuestionDatabase[10];
          const q = qPool[Math.floor(Math.random() * qPool.length)];
          
          options.push(
            { option_letter: "A", text: q.text, topic: q.topic, difficulty: q.difficulty, marks: questionMarks }
          );
        }

        questions.push({
          id: `q${i}`,
          question_number: String(i),
          marks_per_option: questionMarks,
          type,
          choice_text: choiceText,
          options
        });
      }
    }

    return {
      title: `Machine Learning ${isUnitTest ? "Unit Test" : "Semester Examination"}`,
      subject_code: "ML101",
      semester: "V",
      total_marks: totalMarks,
      instructions: instructions,
      questions: questions
    };
  },

  // Dynamic question replacement helper for editing
  getRandomQuestionOfMarks(marks, excludeTexts = []) {
    const isML = true; // For prototype
    if (isML) {
      const pool = this.mlQuestionDatabase[marks] || this.mlQuestionDatabase[5];
      const filtered = pool.filter(q => !excludeTexts.includes(q.text));
      if (filtered.length > 0) {
        const choice = filtered[Math.floor(Math.random() * filtered.length)];
        return {
          text: choice.text,
          topic: choice.topic,
          difficulty: choice.difficulty,
          marks: marks
        };
      }
    }
    
    // Generic fallback replacement
    return {
      text: `Analyze this critical concept. Evaluate its core principles, highlight key mathematical proofs, and suggest optimization methodologies in typical scenarios.`,
      topic: "Core Concept Review",
      difficulty: "Medium",
      marks: marks
    };
  },

  // Main Orchestrator for paper generation
  async generateQuestionPaper(subjectName, subjectCode, semester, topics, examType, totalMarks, modelNumber, markingSchemeStr, choiceStructure) {
    const apiKey = CONFIG.GEMINI_API_KEY;
    const hasKey = apiKey && !apiKey.includes("your-gemini-api-key") && apiKey.trim() !== "";
    
    if (hasKey) {
      try {
        console.log("Querying Gemini for question paper generation...");
        return await this.generateWithGemini(
          CONFIG, subjectName, subjectCode, semester, topics, examType, totalMarks, modelNumber, markingSchemeStr, choiceStructure
        );
      } catch (error) {
        console.error("Gemini Generation failed, falling back to local...", error);
      }
    }

    // Local execution fallback
    const isML = subjectName.toLowerCase().includes("machine learning");
    if (isML) {
      console.log("Generating Machine Learning paper via local database...");
      const paper = this.generateLocalMLPaper(examType, totalMarks, markingSchemeStr, choiceStructure);
      paper.title = `${subjectName} ${examType === "unit_test" ? "Unit Test" : "Semester Examination"} (Model ${modelNumber})`;
      paper.subject_code = subjectCode;
      paper.semester = semester;
      return paper;
    } else {
      console.log("Generating template for custom subject...");
      return this.generateCustomSubjectTemplate(subjectName, subjectCode, semester, examType, totalMarks, markingSchemeStr, choiceStructure);
    }
  }
};

window.AIEngine = AIEngine;
