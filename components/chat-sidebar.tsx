'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Copy, RefreshCw, MessageSquare, Mic, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostImageManager } from '@/components/post-image-manager';
import { ChatInput } from '@/components/chat-input';

interface ChatMessage {
  id: string;
  request: string;
  response: string;
  created_at: string;
}

interface VoiceMessage {
  id: string;
  user_audio_transcript: string;
  ai_response: string;
  created_at: string;
  interaction_type: string;
  duration_ms?: number;
  audio_url?: string;
}

interface PostIdea {
  id: string;
  title: string;
  content: string;
  platform: string;
  post_type: string;
  tags: string[];
  source: string;
  status: string;
  created_at: string;
  user_prompt?: string;
  metadata?: any;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onRegenerate: () => void;
}

export function ChatSidebar({ isOpen, onClose, prompt, onRegenerate }: ChatSidebarProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [voiceHistory, setVoiceHistory] = useState<VoiceMessage[]>([]);
  const [postsHistory, setPostsHistory] = useState<PostIdea[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animatedText, setAnimatedText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'posts'>('chat');

  // Fetch chat history from Supabase
  const fetchChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/chat-history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('API response error:', data.error);
        setChatHistory(data.chats || []);
        return;
      }

      console.log('Chat history fetched successfully:', data.chats?.length || 0, 'messages');
      setChatHistory(data.chats || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setChatHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Fetch voice history from Supabase
  const fetchVoiceHistory = async () => {
    setIsLoadingVoice(true);
    try {
      const res = await fetch('/api/voice-history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Voice API response error:', data.error);
        setVoiceHistory(data.voice || []);
        return;
      }

      console.log('Voice history fetched successfully:', data.voice?.length || 0, 'messages');
      setVoiceHistory(data.voice || []);
    } catch (error) {
      console.error('Error fetching voice history:', error);
      setVoiceHistory([]);
    } finally {
      setIsLoadingVoice(false);
    }
  };

  // Fetch posts history from Supabase
  const fetchPostsHistory = async () => {
    setIsLoadingPosts(true);
    try {
      const res = await fetch('/api/posts-history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Posts API response error:', data.error);
        setPostsHistory(data.posts || []);
        return;
      }

      console.log('Posts history fetched successfully:', data.posts?.length || 0, 'posts');
      setPostsHistory(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts history:', error);
      setPostsHistory([]);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Generate new content
  const generateContent = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setCurrentResponse('');
    setAnimatedText('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: prompt }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await res.json();
      setCurrentResponse(data.message);

      // Refresh chat history to include the new message
      await fetchChatHistory();
    } catch (error) {
      console.error('Error:', error);
      setCurrentResponse('Sorry, there was an error generating your content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new message with optional images
  const handleNewMessage = async (message: string, images?: File[]) => {
    if (!message.trim() && (!images || images.length === 0)) return;

    setIsLoading(true);
    setCurrentResponse('');
    setAnimatedText('');

    try {
      // If images are provided, upload them first
      let imageUrls: string[] = [];
      if (images && images.length > 0) {
        for (const image of images) {
          const formData = new FormData();
          formData.append('file', image);
          formData.append('postId', `temp-${Date.now()}`); // Temporary post ID

          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            imageUrls.push(uploadData.imageUrl);
          }
        }
      }

      // Send message to chat API
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          images: imageUrls,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      const data = await res.json();
      setCurrentResponse(data.message);

      // Refresh all histories to include the new message and any posts created
      await Promise.all([fetchChatHistory(), fetchPostsHistory()]);
    } catch (error) {
      console.error('Error:', error);
      setCurrentResponse('Sorry, there was an error sending your message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Animate text typing effect for current response
  useEffect(() => {
    if (currentResponse && !isLoading) {
      setAnimatedText('');
      let index = 0;
      const timer = setInterval(() => {
        if (index < currentResponse.length) {
          setAnimatedText(currentResponse.slice(0, index + 1));
          index++;
        } else {
          clearInterval(timer);
        }
      }, 20);

      return () => clearInterval(timer);
    }
  }, [currentResponse, isLoading]);

  // Fetch histories when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchChatHistory();
      fetchVoiceHistory();
      fetchPostsHistory();
    }
  }, [isOpen]);

  // Generate new content only when regenerate is called
  const handleRegenerate = () => {
    generateContent();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-[#06040a]">History</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'voice' | 'posts')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full rounded-none border-b border-gray-200 bg-transparent h-12 p-0 flex-shrink-0">
            <TabsTrigger
              value="chat"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#06040a] data-[state=active]:bg-transparent"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#06040a] data-[state=active]:bg-transparent"
            >
              <Mic className="h-4 w-4 mr-2" />
              Voice
            </TabsTrigger>
            <TabsTrigger
              value="posts"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#06040a] data-[state=active]:bg-transparent"
            >
              <FileText className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab Content */}
          <TabsContent value="chat" className="flex-1 overflow-y-auto p-4 space-y-4 m-0 min-h-0">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#06040a]"></div>
                <span className="ml-2 text-sm text-gray-600">Loading chat history...</span>
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No chat history yet</p>
                <p className="text-sm text-gray-400 mt-1">Start a conversation to see your messages here</p>
                <Button onClick={fetchChatHistory} variant="outline" size="sm" className="mt-4 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            ) : (
              <>
                {/* Chat History */}
                {chatHistory.map((chat) => (
                  <div key={chat.id} className="space-y-3 pb-4 border-b border-gray-100 last:border-b-0">
                    {/* User Message */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600 mb-1">You asked:</p>
                      <p className="text-[#06040a]">{chat.request}</p>
                    </div>

                    {/* AI Response */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-blue-600 font-medium">AI Response:</p>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(chat.response)} className="h-7 px-2">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-[#06040a] whitespace-pre-wrap text-sm">{chat.response}</div>
                      <p className="text-xs text-gray-400 mt-2">{new Date(chat.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}

                {/* Current Response (if generating) */}
                {(isLoading || currentResponse) && (
                  <div className="space-y-3 pb-4 border-b border-gray-100">
                    {/* Current User Prompt */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600 mb-1">You asked:</p>
                      <p className="text-[#06040a]">{prompt}</p>
                    </div>

                    {/* Current AI Response */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-blue-600 font-medium">AI Response:</p>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={isLoading} className="h-7 px-2">
                            <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
                          </Button>
                          {currentResponse && (
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(currentResponse)} className="h-7 px-2">
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-blue-600">Generating content...</span>
                        </div>
                      ) : (
                        <div className="text-[#06040a] whitespace-pre-wrap text-sm">
                          {animatedText}
                          {animatedText.length < currentResponse.length && <span className="animate-pulse">|</span>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Voice Tab Content */}
          <TabsContent value="voice" className="flex-1 overflow-y-auto p-4 space-y-4 m-0 min-h-0">
            {isLoadingVoice ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#06040a]"></div>
                <span className="ml-2 text-sm text-gray-600">Loading voice history...</span>
              </div>
            ) : voiceHistory.length === 0 ? (
              <div className="text-center py-8">
                <Mic className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No voice interactions yet</p>
                <p className="text-sm text-gray-400 mt-1">Use the voice assistant to see your conversations here</p>
                <Button onClick={fetchVoiceHistory} variant="outline" size="sm" className="mt-4 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            ) : (
              <>
                {/* Voice History */}
                {voiceHistory.map((voice) => (
                  <div key={voice.id} className="space-y-3 pb-4 border-b border-gray-100 last:border-b-0">
                    {/* User Voice Input */}
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-purple-600 font-medium">You said:</p>
                        <span className="text-xs text-purple-400 uppercase">{voice.interaction_type}</span>
                      </div>
                      <p className="text-[#06040a]">{voice.user_audio_transcript}</p>
                      {voice.duration_ms && <p className="text-xs text-purple-400 mt-1">Duration: {(voice.duration_ms / 1000).toFixed(1)}s</p>}
                    </div>

                    {/* AI Voice Response */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-green-600 font-medium">AI Response:</p>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(voice.ai_response)} className="h-7 px-2">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-[#06040a] whitespace-pre-wrap text-sm">{voice.ai_response}</div>
                      <p className="text-xs text-gray-400 mt-2">{new Date(voice.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          {/* Posts Tab Content */}
          <TabsContent value="posts" className="flex-1 overflow-y-auto p-4 space-y-4 m-0 min-h-0">
            {isLoadingPosts ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#06040a]"></div>
                <span className="ml-2 text-sm text-gray-600">Loading posts...</span>
              </div>
            ) : postsHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No post ideas yet</p>
                <p className="text-sm text-gray-400 mt-1">Generated post ideas will appear here</p>
                <Button onClick={fetchPostsHistory} variant="outline" size="sm" className="mt-4 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            ) : (
              <>
                {/* Posts History */}
                {postsHistory.map((post) => (
                  <div key={post.id} className="space-y-3 pb-4 border-b border-gray-100 last:border-b-0">
                    {/* Post Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-[#06040a] text-sm">{post.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{post.platform}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{post.post_type}</span>
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded',
                              post.status === 'published' && 'bg-green-100 text-green-600',
                              post.status === 'draft' && 'bg-yellow-100 text-yellow-600',
                              post.status === 'idea' && 'bg-purple-100 text-purple-600'
                            )}
                          >
                            {post.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <PostImageManager
                          postId={post.id}
                          currentImageUrl={post.metadata?.image_url}
                          onImageUpdated={(imageUrl) => {
                            // Refresh posts history to show updated image
                            fetchPostsHistory();
                          }}
                        />
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(post.content)} className="h-7 px-2">
                          <Copy className="h-3 w-3" />
                        </Button>
                        {post.metadata?.url && (
                          <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                            <a href={post.metadata.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-[#06040a] text-sm whitespace-pre-wrap">{post.content}</p>

                      {/* Display post image if available */}
                      {post.metadata?.image_url && (
                        <div className="mt-3">
                          <img
                            src={post.metadata.image_url}
                            alt={post.title}
                            className="w-full max-h-48 object-cover rounded-lg border"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Post Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag, index) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Post Metadata */}
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>Source: {post.source}</p>
                      <p>{new Date(post.created_at).toLocaleString()}</p>
                      {post.user_prompt && <p className="text-gray-500 italic">From: "{post.user_prompt}"</p>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-3">
          {/* Show regenerate button for initial prompt */}
          {prompt && (
            <Button onClick={handleRegenerate} disabled={isLoading} className="w-full bg-[#06040a] hover:bg-[#06040a]/90 text-white">
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New Response
                </>
              )}
            </Button>
          )}

          {/* Chat Input */}
          <ChatInput onSendMessage={handleNewMessage} isLoading={isLoading} placeholder="Ask me to create content, posts, or analyze images..." />
        </div>
      </div>
    </div>
  );
}
