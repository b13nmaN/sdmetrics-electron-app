// src/services/llm-recommendations.js
import Together from 'together-ai';

const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;

if (!apiKey) {
  console.error("CRITICAL: VITE_TOGETHER_API_KEY is not set. LLM recommendations will fail.");
}

const together = new Together({
  apiKey: apiKey,
});

export const getDirectLLMDesignRecommendations = async (focusedContext, violations, elementName) => {
  if (!apiKey) {
    throw new Error("VITE_TOGETHER_API_KEY is not configured. Cannot call LLM API.");
  }
  try {
    const systemPrompt = `You are a senior software architect giving advice to expert engineers. Be direct and precise.

For each metric violation:
- CAMC (Cohesion): Identify which methods/attributes don't belong together and exactly what to extract
- Dep_Out (Coupling): Identify specific dependencies to remove or abstract

Format your response as bullet points with concrete actions:

**${elementName || 'Element'} Recommendations:**
- [Action verb] [specific component] to [specific outcome]
- Create interface [name] to abstract [specific dependencies]
- Extract [specific methods/attributes] into new class [suggested name]
- Replace [specific dependency] with [specific alternative]`;

    let violationsString = "";
    console.log("Violations:", violations);
    if (violations && violations.length > 0) {
        violationsString = "Fix these violations:\n";
        violations.forEach(v => {
            violationsString += `- ${v.ViolatedMetric}: ${v.MetricValue}/${v.Threshold}\n`;
        });
    }

    const userPrompt = `
Analyze this element: \`${elementName || 'Unknown'}\`

Context:
\`\`\`
${focusedContext}
\`\`\`

${violationsString}

Provide 3-5 specific, actionable refactorings based on the violated metrics and context. Be concrete - name specific methods, classes, and interfaces to change.
`;

    const llmResponse = await together.chat.completions.create({
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });

    if (llmResponse.choices && llmResponse.choices.length > 0) {
      return llmResponse.choices[0].message.content;
    } else {
      throw new Error('No response from LLM or unexpected response structure');
    }
  } catch (error) {
    console.error('Error directly fetching LLM recommendations:', error);
    let errorMessage = 'Failed to get recommendations from LLM';
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
        errorMessage += `: ${error.response.status || ''} ${JSON.stringify(error.response.data)}`;
    } else if (error.message) {
        errorMessage += `: ${error.message}`;
    }
    if (error.status) {
        errorMessage += ` (Status: ${error.status})`;
    }
    throw new Error(errorMessage);
  }
};