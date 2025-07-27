'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, VolumeX, Volume2, List, Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceAssistantProps {
  className?: string;
}

export function VoiceAssistant({ className }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState('');
  const [useConversationalAgent, setUseConversationalAgent] = useState(true);

  // Agent-specific states
  const [agentStatus, setAgentStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [agentMode, setAgentMode] = useState<'listening' | 'speaking'>('listening');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<any>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.onplay = () => setIsPlaying(true);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Clean up conversation on unmount
      if (conversationRef.current) {
        conversationRef.current.endSession?.();
      }
    };
  }, []);

  // Start conversational agent using ElevenLabs SDK
  const startConversationAgent = useCallback(async () => {
    try {
      setError(null);
      setAgentStatus('connecting');
      setProcessingStep('Connecting to conversational agent...');

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Dynamically import the ElevenLabs client
      const { Conversation } = await import('@elevenlabs/client');

      // Start the conversation using the official SDK
      conversationRef.current = await Conversation.startSession({
        agentId: 'agent_1101k161d5y2fp1ssvejv791505r',
        onConnect: () => {
          console.log('Connected to ElevenLabs agent');
          setAgentStatus('connected');
          setError('✅ Connected to conversational agent!');
          setProcessingStep('');
        },
        onDisconnect: () => {
          console.log('Disconnected from ElevenLabs agent');
          setAgentStatus('disconnected');
          setAgentMode('listening');
          setError('Disconnected from conversational agent');
          setProcessingStep('');
          conversationRef.current = null;
        },
        onError: (error: any) => {
          console.error('ElevenLabs conversation error:', error);
          setError(`❌ Agent Error: ${error.message || error}`);
          setAgentStatus('disconnected');
          setProcessingStep('');
        },
        onModeChange: (mode: any) => {
          console.log('Agent mode changed:', mode);
          setAgentMode(mode.mode === 'speaking' ? 'speaking' : 'listening');
        },
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setError(`❌ Failed to start agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAgentStatus('disconnected');
      setProcessingStep('');
    }
  }, []);

  // Stop conversational agent
  const stopConversationAgent = useCallback(async () => {
    try {
      if (conversationRef.current) {
        await conversationRef.current.endSession();
        conversationRef.current = null;
      }
      setAgentStatus('disconnected');
      setAgentMode('listening');
      setProcessingStep('');
    } catch (error) {
      console.error('Failed to stop conversation:', error);
      setError(`❌ Failed to stop agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Legacy multi-step recording functions
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        await sendAudioToAPI(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.');
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      setProcessingStep('Processing your voice...');
    }
  };

  const sendAudioToAPI = async (audioBlob: Blob) => {
    try {
      setProcessingStep('Converting speech to text...');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process audio');
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          throw new Error('Server error occurred. Please try again.');
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('audio')) {
        throw new Error('Invalid response format received');
      }

      setProcessingStep('Generating voice response...');

      // Get audio response and play it
      const audioBuffer = await response.arrayBuffer();
      const audioBlobResponse = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlobResponse);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process voice request');
      console.error('API error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const toggleConversationAgent = () => {
    if (agentStatus === 'connected') {
      stopConversationAgent();
    } else {
      startConversationAgent();
    }
  };

  const handleMainAction = () => {
    if (useConversationalAgent) {
      toggleConversationAgent();
    } else {
      toggleRecording();
    }
  };

  // Determine button state and appearance
  const getButtonState = () => {
    if (useConversationalAgent) {
      if (agentStatus === 'connected') {
        return {
          color: agentMode === 'speaking' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600',
          icon: agentMode === 'speaking' ? <Volume2 className="h-6 w-6 text-white animate-pulse" /> : <PhoneOff className="h-6 w-6 text-white" />,
          animate: agentMode === 'speaking',
        };
      } else if (agentStatus === 'connecting') {
        return {
          color: 'bg-yellow-500',
          icon: <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>,
          animate: false,
        };
      } else {
        return {
          color: 'bg-[#06040a] hover:bg-[#06040a]/90',
          icon: <Phone className="h-6 w-6 text-white" />,
          animate: false,
        };
      }
    } else {
      if (isProcessing) {
        return {
          color: 'bg-yellow-500',
          icon: <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>,
          animate: false,
        };
      } else if (isRecording) {
        return {
          color: 'bg-red-500 hover:bg-red-600',
          icon: <MicOff className="h-6 w-6 text-white" />,
          animate: true,
        };
      } else {
        return {
          color: 'bg-[#06040a] hover:bg-[#06040a]/90',
          icon: <Mic className="h-6 w-6 text-white" />,
          animate: false,
        };
      }
    }
  };

  const buttonState = getButtonState();

  return (
    <div className={cn('flex flex-col items-center space-y-2', className)}>
      {/* Main Voice Button */}
      <Button
        onClick={handleMainAction}
        disabled={agentStatus === 'connecting' || (isProcessing && !useConversationalAgent)}
        className={cn(
          'w-16 h-16 rounded-full transition-all duration-300 shadow-lg',
          buttonState.color,
          buttonState.animate && 'animate-pulse',
          (agentStatus === 'connecting' || (isProcessing && !useConversationalAgent)) && 'opacity-50 cursor-not-allowed'
        )}
        size="icon"
      >
        {buttonState.icon}
      </Button>

      {/* Mode Toggle */}
      <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
        <Button
          onClick={() => {
            if (agentStatus === 'connected') {
              stopConversationAgent();
            }
            setUseConversationalAgent(true);
          }}
          variant={useConversationalAgent ? 'default' : 'ghost'}
          size="sm"
          className={cn('text-xs', useConversationalAgent ? 'bg-[#06040a] text-white' : 'text-gray-600')}
        >
          Agent
        </Button>
        <Button
          onClick={() => {
            if (agentStatus === 'connected') {
              stopConversationAgent();
            }
            setUseConversationalAgent(false);
          }}
          variant={!useConversationalAgent ? 'default' : 'ghost'}
          size="sm"
          className={cn('text-xs', !useConversationalAgent ? 'bg-[#06040a] text-white' : 'text-gray-600')}
        >
          Multi-step
        </Button>
      </div>

      {/* Test Buttons - Development only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            onClick={async () => {
              try {
                const response = await fetch('/api/test-conversational-agent');
                const data = await response.json();
                console.log('Conversational Agent Test Result:', data);
                if (data.success) {
                  setError(`✅ Agent Available! Name: ${data.agentName}`);
                } else {
                  setError(`❌ Agent Error: ${data.error}${data.suggestion ? ` - ${data.suggestion}` : ''}`);
                }
              } catch (err) {
                setError(`❌ Agent Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
              }
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Test Agent
          </Button>
          <Button
            onClick={async () => {
              try {
                const response = await fetch('/api/list-agents');
                const data = await response.json();
                console.log('Available Agents:', data);
                if (data.success) {
                  setError(`✅ Found ${data.totalAgents} agents. Check console for details.`);
                } else {
                  setError(`❌ List Agents Error: ${data.error}`);
                }
              } catch (err) {
                setError(`❌ List Agents failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
              }
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <List className="h-3 w-3 mr-1" />
            List Agents
          </Button>
          <Button
            onClick={async () => {
              try {
                const response = await fetch('/api/test-voice');
                const data = await response.json();
                console.log('Multi-step Test Result:', data);
                if (data.success) {
                  setError(`✅ Multi-step API Connected! TTS: ${data.ttsWorking ? 'Working' : 'Failed'}`);
                } else {
                  setError(`❌ Multi-step API Error: ${data.error}`);
                }
              } catch (err) {
                setError(`❌ Multi-step Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
              }
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Test Multi
          </Button>
        </div>
      )}

      {/* Status Text */}
      <div className="text-center">
        {useConversationalAgent ? (
          <>
            {agentStatus === 'connected' && (
              <div className="flex items-center space-x-2">
                <div className={cn('w-2 h-2 rounded-full', agentMode === 'speaking' ? 'bg-blue-500 animate-pulse' : 'bg-green-500')}></div>
                <p className="text-sm text-[#06040a] font-medium">Agent is {agentMode === 'speaking' ? 'speaking' : 'listening'}</p>
              </div>
            )}
            {agentStatus === 'connecting' && processingStep && (
              <div className="flex flex-col items-center space-y-1">
                <p className="text-sm text-[#06040a] font-medium">{processingStep}</p>
                <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#06040a] rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
            {agentStatus === 'disconnected' && <p className="text-sm text-gray-600">Tap to start conversation with agent</p>}
          </>
        ) : (
          <>
            {isRecording && <p className="text-sm text-red-600 font-medium animate-pulse">Recording... Tap to stop</p>}
            {isProcessing && (
              <div className="flex flex-col items-center space-y-1">
                <p className="text-sm text-[#06040a] font-medium">{processingStep}</p>
                <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#06040a] rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
            {isPlaying && (
              <div className="flex items-center space-x-2">
                <Volume2 className="h-4 w-4 text-green-600 animate-pulse" />
                <p className="text-sm text-green-600 font-medium">Playing response</p>
                <Button onClick={stopPlayback} variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <VolumeX className="h-3 w-3" />
                </Button>
              </div>
            )}
            {!isRecording && !isProcessing && !isPlaying && <p className="text-sm text-gray-600">Multi-step processing mode</p>}
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={cn('border rounded-lg p-3 max-w-xs', error.startsWith('✅') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
          <p className={cn('text-sm text-center', error.startsWith('✅') ? 'text-green-600' : 'text-red-600')}>{error}</p>
          <Button
            onClick={() => setError(null)}
            variant="ghost"
            size="sm"
            className={cn('w-full mt-2', error.startsWith('✅') ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700')}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !isProcessing && !isPlaying && !error && agentStatus !== 'connected' && agentStatus !== 'connecting' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 max-w-xs shadow-sm">
          <p className="text-xs text-gray-600 text-center">
            🎤 Voice brainstorming assistant
            <br />
            {useConversationalAgent ? 'Using ElevenLabs conversational agent for natural real-time dialogue' : 'Using multi-step processing for better accuracy'}
            <br />
            Ask me for content ideas, trends, or creative inspiration!
          </p>
        </div>
      )}
    </div>
  );
}
