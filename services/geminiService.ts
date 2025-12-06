import { COUNCIL_MEMBERS, CHAIRMAN, OPENROUTER_API_KEY, SITE_URL, SITE_NAME } from '../constants';
import { Opinion, Review } from '../types';

/**
 * Custom error helper to tag critical failures that should stop the whole process.
 */
class CouncilError extends Error {
  isCritical: boolean;
  constructor(message: string, isCritical: boolean = false) {
    super(message);
    this.name = 'CouncilError';
    this.isCritical = isCritical;
  }
}

/**
 * Generic function to call OpenRouter API with enhanced error parsing
 */
async function callOpenRouter(
  model: string, 
  systemPrompt: string, 
  userContent: string,
  temperature: number = 0.7
): Promise<string> {
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: temperature,
        max_tokens: 1500,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMessage = `API Error ${response.status}`;
      
      // Try to parse detailed JSON error from OpenRouter
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          errorMessage = errJson.error.message;
        } else if (errJson.message) {
          errorMessage = errJson.message;
        }
      } catch (e) {
        // Fallback to raw text if parsing fails
        errorMessage += `: ${errText.slice(0, 100)}`;
      }

      // Handle specific status codes
      if (response.status === 401) {
        throw new CouncilError(`Authentication Failed. Please check your OpenRouter API Key. (${errorMessage})`, true);
      }
      if (response.status === 402) {
        throw new CouncilError(`Insufficient Credits. Your OpenRouter account balance is too low. (${errorMessage})`, true);
      }
      if (response.status === 429) {
        throw new CouncilError(`Rate Limit Exceeded. The system is under heavy load. (${errorMessage})`, true);
      }
      if (response.status === 404) {
        throw new CouncilError(`Model Unavailable: ${model} could not be found.`, false); // Not critical, other models can proceed
      }
      if (response.status >= 500) {
        throw new CouncilError(`OpenRouter Server Error (${response.status}).`, false);
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated.";

  } catch (error) {
    // If it's already a CouncilError, just rethrow
    if (error instanceof CouncilError) {
      throw error;
    }
    // Otherwise wrap it
    console.error(`Error calling model ${model}:`, error);
    throw new Error(`Connection failed: ${(error as Error).message}`);
  }
}

/**
 * Stage 1: Get initial opinions from all council members in parallel.
 */
export const fetchInitialOpinions = async (query: string): Promise<Opinion[]> => {
  const promises = COUNCIL_MEMBERS.map(async (member) => {
    try {
      const content = await callOpenRouter(
        member.model, 
        member.systemPrompt, 
        query, 
        0.7
      );
      
      return {
        personaId: member.id,
        content: content
      };
    } catch (error: any) {
      // If it's a critical error (Auth/Credits), we must stop the whole process
      if (error.isCritical) {
        throw error;
      }

      // Otherwise, return the error as content so the council can continue
      return {
        personaId: member.id,
        content: `[System Error: ${member.name} is currently offline. Reason: ${error.message}]`
      };
    }
  });

  return Promise.all(promises);
};

/**
 * Stage 2: Have members review each other's work.
 */
export const fetchReviews = async (query: string, opinions: Opinion[]): Promise<Review[]> => {
  const reviewPromises: Promise<Review>[] = [];

  for (const reviewer of COUNCIL_MEMBERS) {
    for (const opinion of opinions) {
      if (opinion.personaId === reviewer.id) continue;

      const targetMember = COUNCIL_MEMBERS.find(m => m.id === opinion.personaId);
      if (!targetMember) continue;

      // Skip reviewing if the target failed to produce content
      if (opinion.content.startsWith('[System Error')) continue;

      const reviewTask = async (): Promise<Review> => {
        try {
          const reviewPrompt = `
            You are reviewing a response from another AI (acting as ${targetMember.role}).
            
            ORIGINAL USER QUERY: "${query}"
            
            PEER RESPONSE TO REVIEW:
            "${opinion.content}"
            
            TASK:
            Critique this response. 
            1. Is it accurate?
            2. What did they miss?
            3. Rate it 1-10 on Insightfulness.
            
            Keep your critique CONCISE (max 100 words). Be constructive but competitive.
          `;

          const content = await callOpenRouter(
            reviewer.model,
            reviewer.systemPrompt,
            reviewPrompt,
            0.5
          );

          return {
            reviewerId: reviewer.id,
            targetId: opinion.personaId,
            content: content
          };
        } catch (error: any) {
           if (error.isCritical) throw error;
           
           return {
            reviewerId: reviewer.id,
            targetId: opinion.personaId,
            content: `[Unable to review. Error: ${error.message}]`
          };
        }
      };

      reviewPromises.push(reviewTask());
    }
  }

  return Promise.all(reviewPromises);
};

/**
 * Stage 3: The Chairman synthesizes everything.
 */
export const fetchChairmanVerdict = async (
  query: string, 
  opinions: Opinion[], 
  reviews: Review[]
): Promise<string> => {
  
  let briefing = `USER QUERY: "${query}"\n\n--- COUNCIL OPINIONS ---\n`;
  
  opinions.forEach(op => {
    const member = COUNCIL_MEMBERS.find(m => m.id === op.personaId);
    briefing += `\n[MEMBER: ${member?.name}]\n${op.content}\n`;
  });

  briefing += `\n\n--- PEER REVIEWS ---\n`;
  
  reviews.forEach(rev => {
    const reviewer = COUNCIL_MEMBERS.find(m => m.id === rev.reviewerId);
    const target = COUNCIL_MEMBERS.find(m => m.id === rev.targetId);
    briefing += `\n[${reviewer?.name} reviewing ${target?.name}]:\n${rev.content}\n`;
  });

  briefing += `\n\n--- YOUR TASK ---\nSynthesize the final answer based on the above debate. Be authoritative.`;

  try {
    const content = await callOpenRouter(
      CHAIRMAN.model,
      CHAIRMAN.systemPrompt,
      briefing,
      0.4
    );

    return content;
  } catch (error: any) {
    if (error.isCritical) throw error;
    
    console.error("Chairman error:", error);
    return `[The Chairman has crashed and cannot render a verdict. Error: ${error.message}]`;
  }
};