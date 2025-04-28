import { z } from "zod";

/**
 * Represents the role of a message participant in the chat
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Represents a single message in the chat conversation
 */
export interface Message {
  /** The role of the message sender */
  role: MessageRole;
  /** The content of the message */
  content: string;
  /** Optional name of the participant */
  name?: string;
  /** Optional function call details */
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * Represents the available AI models for chat
 */
export type AIModel = "openai" | "gemini" | "deepseek";

/**
 * Represents the configuration for each AI model
 */
export interface ModelConfig {
  /** The model identifier */
  model: string;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Maximum output tokens (for Gemini) */
  maxOutputTokens?: number;
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
}

/**
 * Represents the API configuration for each model
 */
export interface APIConfig {
  /** The base endpoint URL */
  endpoint: string;
  /** Model-specific configuration */
  config: ModelConfig;
  /** Required API headers */
  headers?: Record<string, string>;
}

/**
 * Represents the request body for chat completion
 */
export interface ChatRequest {
  /** The AI model to use */
  model: AIModel;
  /** Array of messages in the conversation */
  messages: Message[];
  /** Optional streaming flag */
  stream?: boolean;
  /** Optional model-specific parameters */
  parameters?: Record<string, unknown>;
}

/**
 * Represents the response from a chat completion
 */
export interface ChatResponse {
  /** The generated reply */
  reply: string;
  /** Optional error message */
  error?: string;
  /** Optional model usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Optional model-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Represents the type of error that occurred
 */
export type ErrorType = 
  | "API_ERROR"
  | "VALIDATION_ERROR"
  | "CONFIGURATION_ERROR"
  | "UNSUPPORTED_MODEL"
  | "RATE_LIMIT_ERROR"
  | "AUTHENTICATION_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Represents an error in the chat API
 */
export interface ChatError {
  /** Error message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Error type */
  type: ErrorType;
  /** Additional error details */
  details?: unknown;
  /** Suggested action for the user */
  suggestion?: string;
}

// Input validation schema
export const chatRequestSchema = z.object({
  model: z.enum(["openai", "gemini", "deepseek"]),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().min(0),
      name: z.string().optional(),
      function_call: z
        .object({
          name: z.string(),
          arguments: z.string(),
        })
        .optional(),
    })
  ),
  stream: z.boolean().optional(),
  parameters: z.record(z.unknown()).optional(),
});

// Custom error class
export class ChatErrorImpl extends Error implements ChatError {
  constructor(
    message: string,
    public statusCode: number = 500,
    public type: ErrorType = "UNKNOWN_ERROR",
    public details?: unknown,
    public suggestion?: string
  ) {
    super(message);
    this.name = "ChatError";
  }
}

// Common API error codes and their user-friendly messages
export const API_ERROR_MESSAGES: Record<string, { message: string; type: ErrorType; suggestion?: string }> = {
  "429": {
    message: "The selected AI model is currently at capacity.",
    type: "API_ERROR",
    suggestion: "Please try again later or select a different model."
  },
  "401": {
    message: "API key is invalid or not configured.",
    type: "AUTHENTICATION_ERROR",
    suggestion: "Please check your API key in the settings."
  },
  "403": {
    message: "Access to the AI model is forbidden.",
    type: "AUTHENTICATION_ERROR",
    suggestion: "Please verify your API key and permissions."
  },
  "500": {
    message: "The AI service is experiencing issues.",
    type: "API_ERROR",
    suggestion: "Please try again later or contact support if the issue persists."
  },
  "503": {
    message: "The AI service is temporarily unavailable.",
    type: "API_ERROR",
    suggestion: "Please try again in a few minutes."
  },
  "400": {
    message: "Invalid request format.",
    type: "VALIDATION_ERROR",
    suggestion: "Please check your input and try again."
  },
  "NETWORK": {
    message: "Unable to connect to the AI service.",
    type: "NETWORK_ERROR",
    suggestion: "Please check your internet connection and try again."
  },
  "MODEL": {
    message: "The selected model is not available.",
    type: "API_ERROR",
    suggestion: "Please try a different model or check the model's status."
  }
};

// Helper function to create user-friendly error messages
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = "An unexpected error occurred"
): ChatError {
  if (error instanceof ChatErrorImpl) {
    return error;
  }

  if (error instanceof Error) {
    // Handle API errors with status codes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiError = error as any;
    if (apiError?.response?.status) {
      const status = apiError.response.status.toString();
      const errorInfo = API_ERROR_MESSAGES[status] || {
        message: `API Error (${status}): ${apiError.response.data?.error?.message || error.message}`,
        type: "API_ERROR" as ErrorType,
        suggestion: "Please try again later."
      };
      
      return new ChatErrorImpl(
        errorInfo.message,
        apiError.response.status,
        errorInfo.type,
        apiError.response.data,
        errorInfo.suggestion
      );
    }

    // Handle network errors
    if (error.message.includes("network") || error.message.includes("connect")) {
      return new ChatErrorImpl(
        API_ERROR_MESSAGES.NETWORK.message,
        503,
        "NETWORK_ERROR",
        error,
        API_ERROR_MESSAGES.NETWORK.suggestion
      );
    }
  }

  // Default error
  return new ChatErrorImpl(
    defaultMessage,
    500,
    "UNKNOWN_ERROR",
    error,
    "Please try again later or contact support if the issue persists."
  );
} 