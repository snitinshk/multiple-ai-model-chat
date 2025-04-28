import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatErrorImpl, ChatResponse, chatRequestSchema, createErrorResponse } from "../types";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const config = {
  model: "gpt-3.5-turbo",
  maxTokens: 1000,
  temperature: 0.7,
  topP: 1,
  presencePenalty: 0,
  frequencyPenalty: 0,
};

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new ChatErrorImpl(
        "OpenAI API key is not configured",
        500,
        "CONFIGURATION_ERROR",
        undefined,
        "Please configure your OpenAI API key in the environment variables."
      );
    }

    const body = await req.json();
    console.log("Raw request body:", body);
    
    const cleanedMessages = body.messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content?.trim() || "",
    }));
    
    console.log("Cleaned messages:", cleanedMessages);
    
    const validationResult = chatRequestSchema.safeParse({
      ...body,
      messages: cleanedMessages,
    });
    
    if (!validationResult.success) {
      console.error("Validation errors:", validationResult.error);
      throw new ChatErrorImpl(
        "Invalid request format",
        400,
        "VALIDATION_ERROR",
        validationResult.error,
        "Please check your message format and try again."
      );
    }

    const { messages, stream, parameters } = validationResult.data;
    console.log("Sending request to OpenAI...");

    try {
      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          name: msg.name,
          function_call: msg.function_call,
        })),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        presence_penalty: config.presencePenalty,
        frequency_penalty: config.frequencyPenalty,
        stream: stream ?? false,
        ...parameters,
      });

      let reply = "";
      let usage;

      if (stream) {
        console.log("Processing streaming response...");
        const stream = completion as AsyncIterable<OpenAI.ChatCompletionChunk>;
        let fullContent = "";
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          fullContent += content;
        }
        reply = fullContent;
      } else {
        console.log("Processing non-streaming response...");
        const response = completion as OpenAI.ChatCompletion;
        reply = response.choices[0]?.message?.content || "";
        if (response.usage) {
          usage = {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          };
        }
      }

      console.log("OpenAI response received successfully");
      return NextResponse.json({ reply, usage });
    } catch (error) {
      console.error("OpenAI API Error:", error);
      const chatError = createErrorResponse(error, "Failed to get response from OpenAI");
      return NextResponse.json(
        { 
          reply: "", 
          error: chatError.message,
          errorType: chatError.type,
          suggestion: chatError.suggestion,
          details: chatError.details
        },
        { status: chatError.statusCode }
      );
    }
  } catch (error) {
    console.error("Chat API Error:", error);
    const chatError = createErrorResponse(error);
    return NextResponse.json(
      { 
        reply: "", 
        error: chatError.message,
        errorType: chatError.type,
        suggestion: chatError.suggestion,
        details: chatError.details
      },
      { status: chatError.statusCode }
    );
  }
} 