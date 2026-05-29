import { Consultation, Segment, RiskAssessment, TimelineEvent } from './types'

// Realistic doctor-patient conversations with medical terminology
const conversationScripts = [
  {
    title: 'Initial Hypertension Assessment',
    segments: [
      { speaker: 'doctor' as const, text: "Good morning, I'm Dr. Sarah Chen. I see in your chart you've been experiencing some elevated blood pressure readings. How have you been feeling lately?" },
      { speaker: 'patient' as const, text: "Um... yeah, well... I've been... I mean, I've noticed I feel kind of tense lately. Work has been... *pauses* ...really demanding the past few months." },
      { speaker: 'doctor' as const, text: "I understand. Can you tell me more about what's been happening at work? Is it new responsibilities or something else?" },
      { speaker: 'patient' as const, text: "It's... it's multiple things, actually. New position, managing a team, and... *long pause* ...some personal stuff too. I'm not sleeping well either. Maybe three, four hours a night." },
      { speaker: 'doctor' as const, text: "That's concerning. Poor sleep can definitely impact your blood pressure. Have you tried any relaxation techniques or exercise?" },
      { speaker: 'patient' as const, text: "I used to exercise, but... I haven't had time. I know I should, but I'm just... exhausted all the time. Even when I do get rest, I feel anxious." },
      { speaker: 'doctor' as const, text: "Let's explore this anxiety further. When did you first notice it? Was it sudden or gradual?" },
      { speaker: 'patient' as const, text: "*hesitates* About... three months ago? Right around when I got the new job. I wake up with this tightness in my chest sometimes." },
      { speaker: 'doctor' as const, text: "Have you experienced any physical symptoms? Headaches, chest pain, or shortness of breath?" },
      { speaker: 'patient' as const, text: "Yeah, actually... the chest tightness, some... some headaches on weekends. I thought maybe I was just stressed, but... *pause* ...I'm getting worried." },
    ],
    riskLevel: 'moderate' as const,
  },
  {
    title: 'Anxiety Disorder Consultation',
    segments: [
      { speaker: 'doctor' as const, text: "I'm reviewing your self-reported symptoms. You mentioned panic attacks have become more frequent?" },
      { speaker: 'patient' as const, text: "Yes, they started three months ago. It was... one a month, maybe. But now it's like... every week. Sometimes twice a week." },
      { speaker: 'doctor' as const, text: "Can you describe what happens during these episodes?" },
      { speaker: 'patient' as const, text: "*voice slightly higher* It's... my heart starts racing, I can't catch my breath, and I feel like something terrible is going to happen. It's terrifying." },
      { speaker: 'doctor' as const, text: "Do you notice any patterns? Does anything trigger them?" },
      { speaker: 'patient' as const, text: "Uh... *pause* ...crowded places, social situations, and... driving on the highway sometimes. I avoid those now." },
      { speaker: 'doctor' as const, text: "Avoidance can reinforce anxiety. Have you considered cognitive behavioral therapy?" },
      { speaker: 'patient' as const, text: "I... I've thought about it, but I'm worried about cost and also... *hesitates* ...I'm not sure if therapy really works." },
      { speaker: 'doctor' as const, text: "CBT has strong evidence. We could also consider medication as an adjunct. What are your thoughts on that?" },
      { speaker: 'patient' as const, text: "I'm... hesitant about medications. I've heard they can have side effects. But I'm getting desperate. I can't keep living like this." },
    ],
    riskLevel: 'high' as const,
  },
  {
    title: 'Post-Surgical Recovery Follow-up',
    segments: [
      { speaker: 'doctor' as const, text: "How are you managing since your knee surgery three weeks ago?" },
      { speaker: 'patient' as const, text: "Good, actually! The pain is much better. I'm using crutches and doing the physical therapy exercises." },
      { speaker: 'doctor' as const, text: "Excellent. Are you following the weight-bearing restrictions?" },
      { speaker: 'patient' as const, text: "Yeah, exactly as you said. Though it's frustrating not being able to drive or work. I'm a contractor, so..." },
      { speaker: 'doctor' as const, text: "I understand. That can be stressful. How are you managing emotionally?" },
      { speaker: 'patient' as const, text: "Honestly? It's been harder than I expected mentally. More bored than anything. My wife has been great though." },
      { speaker: 'doctor' as const, text: "That's good support to have. Any concerns about the incision or swelling?" },
      { speaker: 'patient' as const, text: "No, the incision looks clean. Some swelling in the afternoon, but it goes down with elevation and ice." },
      { speaker: 'doctor' as const, text: "Perfect. Let's schedule your next physical therapy session. You're progressing well." },
      { speaker: 'patient' as const, text: "Great! I'm ready to get back to normal. Thanks for taking care of me." },
    ],
    riskLevel: 'low' as const,
  },
  {
    title: 'Depression and Sleep Disorder Assessment',
    segments: [
      { speaker: 'doctor' as const, text: "Your sleep study results are concerning. You're experiencing significant sleep fragmentation. How are you feeling during the day?" },
      { speaker: 'patient' as const, text: "*quiet voice* Exhausted. I can barely get through work. I'm making mistakes, forgetting things..." },
      { speaker: 'doctor' as const, text: "Have you noticed any mood changes?" },
      { speaker: 'patient' as const, text: "Yeah... everything feels... *long pause* ...empty, I guess. I used to love photography, but I haven't touched my camera in months." },
      { speaker: 'doctor' as const, text: "How long have you been feeling this way?" },
      { speaker: 'patient' as const, text: "About... six months? Maybe longer. I don't even remember when it started. My wife says I'm not myself." },
      { speaker: 'doctor' as const, text: "Have you had any thoughts of harming yourself?" },
      { speaker: 'patient' as const, text: "*hesitates* Not... not really. I just... I don't see the point in anything. Everything is effort." },
      { speaker: 'doctor' as const, text: "This sounds like depression with significant sleep dysregulation. I'd like to start a selective serotonin reuptake inhibitor and refer you to psychiatry. How do you feel about that?" },
      { speaker: 'patient' as const, text: "*voice slightly stronger* If you think it'll help... I'm willing to try. I need something to change." },
    ],
    riskLevel: 'high' as const,
  },
]

// Generate mock consultation data based on script index
export function generateMockConsultation(scriptIndex: number = 0): Consultation {
  const script = conversationScripts[scriptIndex % conversationScripts.length]
  const segments: Segment[] = script.segments.map((seg, idx) => ({
    id: `seg-${idx}`,
    speaker: seg.speaker,
    speakerName: seg.speaker === 'doctor' ? 'Dr. Sarah Chen' : 'Patient',
    startTime: idx * 45,
    endTime: (idx + 1) * 45,
    text: seg.text,
    confidence: 0.92 + Math.random() * 0.08,
    emotionalState: seg.speaker === 'patient' ? getEmotionalState(seg.text) : undefined,
  }))

  const riskLevel = script.riskLevel
  const riskScores = {
    low: { score: 25 + Math.random() * 15, confidence: 0.88 },
    moderate: { score: 50 + Math.random() * 15, confidence: 0.85 },
    high: { score: 75 + Math.random() * 15, confidence: 0.82 },
  }
  const riskData = riskScores[riskLevel]

  return {
    id: `consultation-${Date.now()}`,
    patientId: 'patient-001',
    patientName: 'James Mitchell',
    providerId: 'provider-001',
    providerName: 'Dr. Sarah Chen',
    date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    duration: segments.length * 45,
    audioUrl: '/sample-audio.mp3',
    transcript: segments,
    emotions: {
      overall: riskLevel === 'high' ? 'anxious' : riskLevel === 'moderate' ? 'concerned' : 'calm',
      confidence: 0.87,
      breakdown: {
        anxiety: riskLevel === 'high' ? 72 : riskLevel === 'moderate' ? 48 : 15,
        stress: riskLevel === 'high' ? 68 : riskLevel === 'moderate' ? 45 : 12,
        concern: riskLevel === 'high' ? 65 : riskLevel === 'moderate' ? 42 : 10,
        calmness: riskLevel === 'high' ? 20 : riskLevel === 'moderate' ? 40 : 75,
        confidence: riskLevel === 'high' ? 25 : riskLevel === 'moderate' ? 45 : 80,
      },
    },
    acousticMetrics: {
      speechRate: riskLevel === 'high' ? 145 : riskLevel === 'moderate' ? 125 : 110,
      pauseDuration: riskLevel === 'high' ? 2.1 : riskLevel === 'moderate' ? 1.5 : 0.8,
      hesitationFrequency: riskLevel === 'high' ? 12 : riskLevel === 'moderate' ? 6 : 1,
      speakingTime: segments.length * 25,
      silenceTime: segments.length * 20,
      speechQuality: riskLevel === 'high' ? 68 : riskLevel === 'moderate' ? 75 : 88,
    },
    nlpMetrics: {
      anxietyScore: riskLevel === 'high' ? 78 : riskLevel === 'moderate' ? 52 : 18,
      stressIndicators:
        riskLevel === 'high'
          ? ['constant worry', 'sleep deprivation', 'physical symptoms']
          : riskLevel === 'moderate'
            ? ['work stress', 'difficulty concentrating']
            : [],
      negativeLanguagePatterns:
        riskLevel === 'high'
          ? ['terrifying', 'desperate', 'cant']
          : riskLevel === 'moderate'
            ? ['worried', 'frustrated']
            : [],
      confidenceLevel: 0.84,
    },
    riskAssessment: generateRiskAssessment(riskLevel, riskData.score, riskData.confidence),
    status: 'completed',
  }
}

function getEmotionalState(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('terrifying') || lower.includes('desperate') || lower.includes('worried'))
    return 'anxious'
  if (lower.includes('frustrated') || lower.includes('tense')) return 'stressed'
  if (lower.includes('great') || lower.includes('good') || lower.includes('excellent')) return 'positive'
  return 'neutral'
}

function generateRiskAssessment(
  level: 'low' | 'moderate' | 'high',
  score: number,
  confidence: number
): RiskAssessment {
  const assessments = {
    low: {
      speechEvidence: {
        title: 'Stable Speech Patterns',
        description: 'Normal speech rate (110 wpm), minimal hesitations, and controlled vocal tone indicate emotional stability.',
        supportingQuotes: ["I'm using crutches and doing the physical therapy exercises", 'My wife has been great though'],
      },
      nlpEvidence: {
        title: 'Positive Language Patterns',
        description: 'No anxiety markers detected. Patient uses words like "great," "good," and "perfect" indicating positive outlook.',
        patterns: ['Positive outlook', 'Good compliance with treatment', 'Strong support system'],
      },
      recommendations: [
        'Continue current treatment plan',
        'Follow-up in 2-4 weeks',
        'Maintain physical therapy regimen',
      ],
    },
    moderate: {
      speechEvidence: {
        title: 'Elevated Speech Patterns',
        description:
          'Increased speech rate (125 wpm), moderate hesitations, and vocal strain suggest underlying stress. Patient exhibits avoidance behaviors.',
        supportingQuotes: [
          'Work has been... really demanding the past few months',
          'New position, managing a team, and... some personal stuff too',
        ],
      },
      nlpEvidence: {
        title: 'Stress Indicators Detected',
        description: 'Multiple stress markers including work pressure, sleep disruption, and physical symptoms of anxiety.',
        patterns: ['Work-related stress', 'Sleep disruption (3-4 hours)', 'Physical tension', 'Difficulty managing workload'],
      },
      recommendations: [
        'Implement stress management techniques',
        'Consider behavioral health referral',
        'Follow-up in 2 weeks',
        'Monitor blood pressure trends',
      ],
    },
    high: {
      speechEvidence: {
        title: 'Severe Speech Dysregulation',
        description:
          'Significantly elevated speech rate (145+ wpm), frequent hesitations and pauses, vocal tremor, and signs of emotional dysregulation. Speech pattern indicates acute distress.',
        supportingQuotes: [
          "It's terrifying",
          'I feel like something terrible is going to happen',
          'I am getting desperate. I cannot keep living like this',
        ],
      },
      nlpEvidence: {
        title: 'Anxiety and Panic Disorder Markers',
        description:
          'High-risk anxiety language including catastrophic thinking, avoidance behaviors, and panic attack descriptions. NLP analysis confirms clinical-level anxiety.',
        patterns: [
          'Catastrophic thinking',
          'Panic attack symptoms',
          'Avoidance behavior',
          'Physical panic symptoms',
          'Impact on daily functioning',
        ],
      },
      recommendations: [
        'Urgent psychiatric referral',
        'Consider medication evaluation',
        'Recommend Cognitive Behavioral Therapy',
        'Safety assessment',
        'Follow-up within 1 week',
      ],
    },
  }

  return {
    level,
    score,
    confidence,
    ...assessments[level],
  }
}

// Generate timeline events showing stress progression
export function generateTimelineEvents(consultationDuration: number, riskLevel: string): TimelineEvent[] {
  const events: TimelineEvent[] = []

  if (riskLevel === 'high') {
    events.push(
      { time: 45, type: 'stress_spike', severity: 'high', description: 'First panic symptom mentioned', stressLevel: 75 },
      { time: 135, type: 'emotion_shift', severity: 'high', description: 'Heightened emotional response', stressLevel: 82 },
      { time: 225, type: 'important_statement', severity: 'high', description: 'Patient expresses desperation', stressLevel: 88 }
    )
  } else if (riskLevel === 'moderate') {
    events.push(
      { time: 45, type: 'stress_spike', severity: 'medium', description: 'Work stress acknowledged', stressLevel: 55 },
      { time: 135, type: 'emotion_shift', severity: 'medium', description: 'Concern about symptoms increases', stressLevel: 62 }
    )
  } else {
    events.push(
      { time: 90, type: 'speaker_change', severity: 'low', description: 'Positive treatment update', stressLevel: 20 }
    )
  }

  return events
}

// Mock consultation history
export function getMockConsultationHistory(count: number = 5) {
  return Array.from({ length: count }, (_, idx) => generateMockConsultation(idx))
}
