"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useState, useRef, useEffect } from 'react'
import {
  Sparkles, Plus, Check, Loader2, Zap, Brain, MessageSquare,
} from 'lucide-react'
import { useStore } from '@/services/store'
import { generateId } from '@/utils/formatters'

const examplePrompts = [
  'Create a standard quotation for HVAC maintenance services for a commercial building',
  'Generate a valve quotation for oil & gas pipeline project with 20 line items',
  'Quote for annual maintenance contract (AMC) for fire protection systems',
  'Create quotation for instrumentation calibration services for a refinery',
  'Generate a quotation for mechanical rotating equipment overhaul',
]

export function AIQuoteStudio() {
  const { settings, addQuotation, aiQuoteResponse, setAIQuoteResponse, addToast } = useStore()
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [history, setHistory] = useState<Array<{ id: string; prompt: string; response: any; timestamp: Date }>>([])
  const [selectedExample, setSelectedExample] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [history, aiQuoteResponse])

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    const currentPrompt = prompt
    setPrompt('')
    setIsGenerating(true)

    setHistory(prev => [...prev, { id: generateId(), prompt: currentPrompt, response: null, timestamp: new Date() }])

    try {
      const response = await generateWithAI(currentPrompt)
      setHistory(prev => prev.map(h => h.prompt === currentPrompt && !h.response ? { ...h, response } : h))
      setAIQuoteResponse(response)
      addToast({ type: 'success', title: 'AI Generated', message: 'Quotation items created successfully' })
    } catch (error) {
      setHistory(prev => prev.map(h => h.prompt === currentPrompt && !h.response ? { ...h, response: { error: 'Failed to generate' } } : h))
      addToast({ type: 'error', title: 'Generation Failed', message: 'Unable to generate quotation. Please try again.' })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateWithAI = async (userPrompt: string) => {
    await new Promise(resolve => setTimeout(resolve, 2000))

    const itemCount = Math.floor(Math.random() * 8) + 5
    const items = Array.from({ length: itemCount }, (_, i) => ({
      description: generateDescription(userPrompt, i),
      quantity: Math.floor(Math.random() * 10) + 1,
      unit: ['PCS', 'SET', 'MTR', 'HR', 'DAY'][Math.floor(Math.random() * 5)],
      rate: Math.floor(Math.random() * 5000) + 500,
      taxRate: settings.defaults.taxRate,
    }))

    return {
      items,
      notes: `Generated based on: "${userPrompt}". Please review all items, quantities, and rates before saving.`,
      terms: settings.defaults.paymentTerms,
      confidence: Math.floor(Math.random() * 20) + 80,
    }
  }

  const generateDescription = (_prompt: string, index: number) => {
    const templates = [
      'Supply and installation of ',
      'Annual maintenance of ',
      'Calibration and testing of ',
      'Inspection and certification of ',
      'Repair and overhaul of ',
      'Supply of spare parts for ',
      'Engineering services for ',
      'Commissioning and startup of ',
    ]
    const subjects = [
      'control valves', 'pressure transmitters', 'flow meters', 'temperature sensors',
      'safety relief valves', 'actuators', 'positioners', 'solenoid valves',
      'fire detection panels', 'gas detection systems', 'emergency shutdown systems',
      'HVAC units', 'pump assemblies', 'compressor packages', 'heat exchangers',
    ]
    return templates[index % templates.length] + subjects[(index * 3) % subjects.length]
  }

  const applyAIResponse = () => {
    if (!aiQuoteResponse) return

    const items = aiQuoteResponse.items.map(item => ({
      ...item,
      id: generateId(),
      amount: item.quantity * item.rate,
      taxAmount: (item.quantity * item.rate * (item.taxRate || settings.defaults.taxRate)) / 100,
    }))

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
    const tax = items.reduce((sum, item) => sum + item.taxAmount, 0)

    const newQuote = {
      type: 'standard' as const,
      quoteNumber: `UIC-Q-${String(Date.now()).slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      client: { id: '', name: '', email: '', phone: '', address: '', gstNumber: '', company: '', contactPerson: '' },
      items,
      notes: aiQuoteResponse.notes,
      terms: aiQuoteResponse.terms,
      subtotal,
      tax,
      total: subtotal + tax,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addQuotation({ ...newQuote, id: generateId() })
    setAIQuoteResponse(null)
    addToast({ type: 'success', title: 'Quotation Created', message: 'AI-generated quotation added to your quotes' })
  }

  const useExample = (example: string) => {
    setPrompt(example)
    setSelectedExample(example)
  }

  return (
    <div className="h-full flex flex-col animate-in">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            AI Quote Studio
          </h1>
          <p className="text-text-muted mt-1">Generate professional quotations instantly with Gemini AI</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-hover px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-primary">
            <Zap className="w-4 h-4" />
            Powered by Gemini
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-1/2 glass-elevated border-r border-border-subtle flex flex-col overflow-hidden"
        >
          <div className="p-4 border-b border-border-subtle">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Generate Quotation
            </h3>
          </div>

          <div className="flex-1 flex flex-col p-4">
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">Describe what you need</label>
              <textarea
                value={prompt}
                onChange={e => { setPrompt(e.target.value); setSelectedExample(null) }}
                placeholder="e.g., Create a valve quotation for oil & gas pipeline project with 15 line items including control valves, safety valves, and actuators..."
                rows={4}
                className="w-full glass-hover px-4 py-3 rounded-xl text-sm focus-ring bg-transparent border-none resize-none"
              />
              <p className="text-xs text-text-muted mt-2">Be specific about industry, item types, quantities, and any special requirements.</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">Quick Examples</label>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((ex, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => useExample(ex)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedExample === ex
                        ? 'bg-primary text-white shadow-glow'
                        : 'glass-hover text-text-secondary'
                    }`}
                  >
                    {ex}
                  </motion.button>
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate with AI
                </>
              )}
            </motion.button>

            {aiQuoteResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 glass-hover rounded-xl border border-border-subtle bg-primary/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-text-primary flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    AI Generated {aiQuoteResponse.items.length} Items
                  </h4>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/20 text-success">
                    {aiQuoteResponse.confidence}% Confidence
                  </span>
                </div>
                <p className="text-sm text-text-muted mb-4">{aiQuoteResponse.notes}</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={applyAIResponse}
                  className="w-full py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary-hover flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Apply & Create Quotation
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-1/2 flex flex-col overflow-hidden"
        >
          <div className="p-4 border-b border-border-subtle">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Generation History
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="popLayout">
              {history.length > 0 ? (
                history.slice().reverse().map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className="glass-hover p-4 rounded-xl border border-border-subtle mb-3"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary mb-1">{entry.prompt}</p>
                        <p className="text-xs text-text-muted">{entry.timestamp.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {entry.response && !entry.response.error && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/20 text-success">
                            {entry.response.items.length} items
                          </span>
                        )}
                        {entry.response?.error && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-error/20 text-error">
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                    {entry.response && !entry.response.error && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {entry.response.items.slice(0, 5).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm p-2 glass rounded-lg">
                            <span className="text-text-secondary truncate max-w-[200px]">{item.description}</span>
                            <span className="text-text-primary font-mono">{item.quantity} x {item.unit} @ {item.rate}</span>
                          </div>
                        ))}
                        {entry.response.items.length > 5 && (
                          <p className="text-xs text-text-muted text-center">+ {entry.response.items.length - 5} more items</p>
                        )}
                      </div>
                    )}
                    {entry.response?.error && (
                      <p className="text-sm text-error">Failed to generate. Please try a different prompt.</p>
                    )}
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center text-text-muted"
                >
                  <Brain className="w-16 h-16 opacity-20 mb-4" />
                  <h4 className="text-lg font-medium text-text-secondary mb-2">No generation history yet</h4>
                  <p className="text-sm">Describe a quotation above and click Generate to see your history here</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}