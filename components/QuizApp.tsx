// components/QuizApp.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Timer, Check, X } from 'lucide-react';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const QuizApp = () => {
  const [subject, setSubject] = useState('');
  const [quizName, setQuizName] = useState('');
  const [duration, setDuration] = useState(30);
  const [rawText, setRawText] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentView, setCurrentView] = useState('input'); // 'input' or 'quiz'
  const [answeredCount, setAnsweredCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  useEffect(() => {
    let timer;
    if (currentView === 'quiz' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentView, timeLeft]);

  const parseQuestions = (text) => {
    const questions = [];
    const lines = text.split('\n');
    let currentQuestion = null;

    for (let line of lines) {
      if (line.trim() === '') continue;

      if (!line.startsWith('Answer:')) {
        if (line.match(/^[a-d]\)/)) {
          // This is an option
          if (currentQuestion) {
            const option = line.match(/^([a-d]\))\s*(.*)/);
            currentQuestion.options[option[1].charAt(0)] = option[2].trim();
          }
        } else {
          // This is a new question
          if (currentQuestion) questions.push(currentQuestion);
          currentQuestion = {
            question: line.split('?')[0] + '?',
            options: {},
            correctAnswer: null,
            userAnswer: null
          };
        }
      } else {
        // This is the answer
        const answer = line.match(/Answer:\s*([a-d])/);
        if (currentQuestion && answer) {
          currentQuestion.correctAnswer = answer[1];
          questions.push(currentQuestion);
          currentQuestion = null;
        }
      }
    }

    return questions;
  };

  const handleTextSubmit = async () => {
    const parsedQuestions = parseQuestions(rawText);
    setQuestions(parsedQuestions);
    
    // Save to Firebase
    try {
      const quizRef = await addDoc(collection(db, 'quizzes'), {
        subject,
        quizName,
        duration,
        questions: parsedQuestions,
        createdAt: new Date()
      });
      setCurrentView('quiz');
      setTimeLeft(duration * 60);
    } catch (error) {
      console.error('Error saving quiz:', error);
    }
  };

  const handleAnswer = (questionIndex, answer) => {
    const newQuestions = [...questions];
    if (!newQuestions[questionIndex].userAnswer) {
      setAnsweredCount(prev => prev + 1);
    }
    newQuestions[questionIndex].userAnswer = answer;
    setQuestions(newQuestions);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (currentView === 'input') {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold">Create New Quiz</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Subject Name"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Input
              placeholder="Quiz Name"
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Duration (minutes)"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            />
            <Textarea
              placeholder="Paste your questions here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
            />
            <Button onClick={handleTextSubmit}>Create Quiz</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{quizName}</h2>
          <p className="text-sm text-gray-600">{subject}</p>
        </div>
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4" />
          <span className="font-mono">{formatTime(timeLeft)}</span>
        </div>
      </div>
      <div className="mb-4">
        <p>Progress: {answeredCount}/{questions.length} questions answered</p>
      </div>
      {questions.map((q, idx) => (
        <Card key={idx} className="mb-4">
          <CardContent className="p-4">
            <p className="font-medium mb-4">{q.question}</p>
            <div className="space-y-2">
              {Object.entries(q.options).map(([key, value]) => (
                <div
                  key={key}
                  className={`p-2 rounded cursor-pointer flex items-center justify-between ${
                    q.userAnswer === key
                      ? q.userAnswer === q.correctAnswer
                        ? 'bg-green-100'
                        : 'bg-red-100'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleAnswer(idx, key)}
                >
                  <span>{`${key}) ${value}`}</span>
                  {q.userAnswer === key && (
                    q.userAnswer === q.correctAnswer ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuizApp;
