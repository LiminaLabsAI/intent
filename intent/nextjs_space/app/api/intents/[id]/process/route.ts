export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionOrApiKey } from '@/lib/api-auth';

const STAGE_NAMES: Record<number, string> = {
  2: 'Intent Parsing',
  3: 'Semantic Understanding',
  4: 'Intent Normalization',
  5: 'Intent Quality Gate',
  6: 'Approval Decision Engine',
};

function buildStagePrompt(stage: number, rawInput: string, previousResults: any): { system: string; user: string } {
  const contextNote = `[CRITICAL RULE]: The raw input may contain a section labeled '[Clarifications Added]'. Treat any Q&A in that section as the user's latest, authoritative context from our ongoing conversation.`;
  
  const prompts: Record<number, { system: string; user: string }> = {
    2: {
      system: `You are an intent parsing engine. Extract structured data from natural language intents.
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.
Respond in JSON format with this structure:
{
  "requestedServices": ["list of specific services or products requested"],
  "primaryAction": "description of the primary action",
  "urgency": "LOW, MEDIUM, HIGH, CRITICAL",
  "userGoal": "the end goal the user wants to achieve"
}`,
      user: `${contextNote}\n\nParse this intent: "${rawInput}"`
    },
    3: {
      system: `You are a semantic understanding engine. Analyze business context and transaction type.
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.
Respond in JSON format with this structure:
{
  "intentCategory": "one of: PURCHASE, SUBSCRIBE, UPGRADE, CONSULTING, SUPPORT, GENERAL",
  "targetProductsOrFeatures": ["list of products or features"],
  "monetizationPotential": "HIGH, MEDIUM, LOW",
  "confidenceScore": 0.85
}`,
      user: `${contextNote}\n\nUnderstand this intent semantically:\nRaw: "${rawInput}"\nParsed data: ${JSON.stringify(previousResults?.stage2 ?? {})}`
    },
    4: {
      system: `You are an intent normalization engine. Standardize the intent into a formal service request.
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.
Respond in JSON format with this structure:
{
  "formalServiceRequest": "formalized description of the requested transaction/service",
  "requiredResources": ["list of resources or prerequisites needed"],
  "estimatedComplexity": "LOW, MEDIUM, HIGH"
}`,
      user: `${contextNote}\n\nNormalize this intent:\nRaw: "${rawInput}"\nParsed: ${JSON.stringify(previousResults?.stage2 ?? {})}\nSemantic: ${JSON.stringify(previousResults?.stage3 ?? {})}`
    },
    5: {
      system: `You are an intent quality gate. Evaluate if the request has enough detail for checkout or execution.
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.
Respond in JSON format with this structure:
{
  "actionabilityScore": 0.9,
  "clarityScore": 0.85,
  "qualityGateResult": "PASS or FAIL",
  "missingInformation": ["list of missing details required to proceed"],
  "questions": ["list of 2-3 specific clarifying questions to ask the user if qualityGateResult is FAIL"],
  "conversationalReply": "A detailed, convincing paragraph explaining to the user exactly what is missing and asking them the necessary clarifying questions to proceed with their request in a natural conversational tone."
}`,
      user: `${contextNote}\n\nEvaluate quality of this intent:\nRaw: "${rawInput}"\nService Request: "${previousResults?.stage4?.formalServiceRequest ?? ''}"\nCategory: "${previousResults?.stage3?.intentCategory ?? ''}"`
    },
    6: {
      system: `You are a fulfillment decision engine. Evaluate readiness, cost, and risk to decide the next action.
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.
Respond in JSON format with this structure:
{
  "decisionOutcome": "one of: READY_FOR_CHECKOUT, NEEDS_CLARIFICATION, MANUAL_QUOTE_REQUIRED, REJECTED",
  "costCategory": "FREE, TIER_1, TIER_2, CUSTOM_QUOTE",
  "riskLevel": "LOW, MEDIUM, or HIGH",
  "reasoning": "explanation of the decision",
  "conditions": ["any conditions or prerequisites"]
}`,
      user: `${contextNote}\n\nMake approval decision for this intent:\nRaw: "${rawInput}"\nGoal: "${previousResults?.stage2?.userGoal ?? ''}"\nQuality Gate: ${previousResults?.stage5?.qualityGateResult ?? 'N/A'}\nActionability: ${previousResults?.stage5?.actionabilityScore ?? 'N/A'}\nConfidence: ${previousResults?.stage3?.confidenceScore ?? 'N/A'}`
    },
  };
  return prompts[stage] ?? { system: '', user: '' };
}

function getMockResultForStage(stage: number, rawInput: string, previousResults: any) {
  const words = rawInput.split(' ').map(w => w.replace(/[^a-zA-Z0-9]/g,"")).filter(w => w.length > 3);
  const entities = Array.from(new Set(words.filter(w => w[0] === w[0]?.toUpperCase()))).slice(0, 4);
  if (entities.length === 0) {
    entities.push("System Assets", "Integration Flow");
  }

  const stageMocks: Record<number, any> = {
    2: {
      requestedServices: entities.length > 0 ? entities : ["Premium Support"],
      primaryAction: "Process transaction",
      urgency: "MEDIUM",
      userGoal: `Goal identified from request: "${rawInput}".`
    },
    3: {
      intentCategory: "UPGRADE",
      targetProductsOrFeatures: entities,
      monetizationPotential: "HIGH",
      confidenceScore: 0.95
    },
    4: {
      formalServiceRequest: `Formal service and transaction request for: "${rawInput}".`,
      requiredResources: ["Billing Authorization", "Account Validation"],
      estimatedComplexity: "LOW"
    },
    5: {
      actionabilityScore: rawInput.length < 30 ? 0.65 : 0.95,
      clarityScore: rawInput.length < 30 ? 0.60 : 0.90,
      qualityGateResult: rawInput.length < 30 ? "FAIL" : "PASS",
      missingInformation: rawInput.length < 30 ? ["Specific product details", "Billing tier"] : [],
      questions: rawInput.length < 30 ? [
        "Which specific tier are you looking to upgrade to?",
        "Do you need this for a team or an individual account?"
      ] : [],
      conversationalReply: rawInput.length < 30 ? "I see you want to proceed with a request, but I need a few more details to set up the checkout properly. Could you specify which tier you are looking for?" : "Looks great!"
    },
    6: {
      decisionOutcome: rawInput.length < 30 ? "NEEDS_CLARIFICATION" : "READY_FOR_CHECKOUT",
      costCategory: "TIER_1",
      riskLevel: "LOW",
      reasoning: "Intent matches standard transactional criteria and is ready for fulfillment processing.",
      conditions: []
    }
  };

  return stageMocks[stage] ?? {};
}

async function callLLMForStage(
  stage: number,
  rawInput: string,
  previousResults: any
): Promise<any> {
  try {
    const { system, user } = buildStagePrompt(stage, rawInput, previousResults);

    // Read active LLM configuration
    const config = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
    let provider = config?.provider ?? 'abacusai';
    let apiKey = config?.apiKey ?? '';
    let endpointUrl = config?.endpoint ?? '';
    let modelId = config?.modelId ?? '';

    // Fallback to ENV variable if missing in DB
    if (provider === 'huggingface' && !apiKey) {
      apiKey = process.env.HUGGINGFACE_API_KEY || '';
    }

    // DYNAMIC CLOUD OVERRIDE: Vercel cannot reach localhost Ollama
    if (process.env.NODE_ENV === 'production' && provider === 'ollama') {
      provider = 'huggingface';
      apiKey = process.env.HUGGINGFACE_API_KEY || apiKey;
      modelId = 'google/gemma-4-31B-it:novita';
      endpointUrl = ''; 
    }

    let url = 'https://apps.abacus.ai/v1/chat/completions';
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let model = 'gpt-4o-mini';

    if (provider === 'abacusai') {
      const activeKey = apiKey || process.env.ABACUSAI_API_KEY;
      headers['Authorization'] = `Bearer ${activeKey}`;
    } else if (provider === 'huggingface') {
      const activeModel = modelId || 'google/gemma-4-31B-it:novita';
      url = endpointUrl || `https://router.huggingface.co/v1/chat/completions`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      model = activeModel;
    } else if (provider === 'ollama') {
      url = endpointUrl || 'http://localhost:11434/v1/chat/completions';
      model = modelId || 'llama3.1';
    }

    console.log(`[Pipeline Stage ${stage}] Dispatching request to ${provider} using model: ${model} (Endpoint: ${url})`);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: true,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error for stage ${stage} via ${provider}: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let partialRead = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      partialRead += decoder.decode(value, { stream: true });
      const lines = partialRead.split('\n');
      partialRead = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            buffer += parsed?.choices?.[0]?.delta?.content ?? '';
          } catch (e) {
            // skip
          }
        }
      }
    }

    const parsedData = JSON.parse(buffer);
    if (parsedData.success === false || parsedData.error) {
      throw new Error(parsedData.error || "LLM API returned error flag");
    }
    console.log(`[Pipeline Stage ${stage}] Successful response from ${provider}!`);
    return parsedData;

  } catch (error: any) {
    console.warn(`[Pipeline Stage ${stage}] LLM API failed. Throwing error directly to UI to diagnose:`, error.message);
    throw error;
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionOrApiKey(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const intent = await prisma.intent.findUnique({ where: { id: params.id } });
    if (!intent) {
      return new Response(JSON.stringify({ error: 'Intent not found' }), { status: 404 });
    }
    if (user.role === 'END_USER' && intent.requesterId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        const previousResults: any = {};

        try {
          // Update status to IN_PROGRESS
          await prisma.intent.update({
            where: { id: params.id },
            data: { status: 'IN_PROGRESS', currentStage: 2 },
          });

          for (let stage = 2; stage <= 6; stage++) {
            sendEvent({
              type: 'stage_start',
              stage,
              stageName: STAGE_NAMES[stage],
              message: `Processing ${STAGE_NAMES[stage]}...`,
            });

            try {
              const result = await callLLMForStage(stage, intent.rawInput, previousResults);
              previousResults[`stage${stage}`] = result;

              // Update intent with stage results
              const updateData: any = { currentStage: stage };
              if (stage === 2) {
                updateData.entities = result?.entities ?? [];
                updateData.actions = result?.actions ?? [];
                updateData.scope = result?.scope ?? null;
                updateData.businessDomain = result?.businessDomain ?? null;
                updateData.initialContext = result?.initialContext ?? null;
              } else if (stage === 3) {
                updateData.businessObjective = result?.businessObjective ?? null;
                updateData.intentType = ['CHANGE', 'CREATE', 'ANALYZE', 'REPORT', 'DELETE', 'UPDATE', 'OTHER'].includes(result?.intentType) ? result.intentType : 'OTHER';
                updateData.affectedAssets = result?.affectedAssets ?? [];
                updateData.confidenceScore = typeof result?.confidenceScore === 'number' ? result.confidenceScore : null;

                // Search similar intents
                try {
                  const searchWords = intent.rawInput.split(' ')
                    .map(w => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
                    .filter(w => w.length > 4);

                  const potentialMatches = await prisma.intent.findMany({
                    where: {
                      id: { not: params.id },
                      status: { not: 'ARCHIVED' },
                    },
                    select: {
                      id: true,
                      intentId: true,
                      rawInput: true,
                      status: true,
                      standardizedIntent: true,
                    },
                    take: 10,
                  });

                  const similarIntents = potentialMatches.map(item => {
                    const itemWords = item.rawInput.split(' ')
                      .map(w => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
                      .filter(w => w.length > 4);
                    const overlap = searchWords.filter(w => itemWords.includes(w)).length;
                    return { ...item, overlap };
                  })
                  .filter(item => item.overlap > 0)
                  .sort((a, b) => b.overlap - a.overlap);

                  const totalCount = similarIntents.length;
                  const approvedCount = similarIntents.filter(i => i.status === 'APPROVED').length;
                  
                  let recommendation = "Proceed as a standalone intent.";
                  const topMatch = similarIntents[0];
                  if (topMatch) {
                    if (topMatch.status === 'APPROVED') {
                      recommendation = `The LLM highly recommends linking this intent as a sub-task of approved intent ${topMatch.intentId || 'INT-NEW'} to leverage approved schemas.`;
                    } else {
                      recommendation = `A similar intent (${topMatch.intentId || 'INT-NEW'}) is currently ${topMatch.status.replace(/_/g, ' ')}. We suggest coordinating to prevent deployment script conflicts.`;
                    }
                  }

                  result.similarIntents = similarIntents.slice(0, 3).map(({ overlap, ...rest }) => rest);
                  result.similaritySummary = {
                    totalCount,
                    approvedCount,
                    recommendation
                  };
                } catch (e) {
                  // silent catch
                }
              } else if (stage === 4) {
                updateData.standardizedIntent = result?.standardizedIntent ?? null;
                updateData.ontologyMappings = result?.ontologyMappings ?? {};
                updateData.domainAlignment = result?.domainAlignment ?? null;
                updateData.normalizedScope = result?.normalizedScope ?? null;
              } else if (stage === 5) {
                updateData.completenessScore = typeof result?.completenessScore === 'number' ? result.completenessScore : null;
                updateData.clarityScore = typeof result?.clarityScore === 'number' ? result.clarityScore : null;
                updateData.consistencyScore = typeof result?.consistencyScore === 'number' ? result.consistencyScore : null;
                updateData.qualityGateResult = result?.qualityGateResult ?? null;
                updateData.qualityGateDetails = { issues: result?.issues ?? [], suggestions: result?.suggestions ?? [] };

                if (result?.qualityGateResult === 'FAIL' || (updateData.completenessScore !== null && updateData.completenessScore < 0.8) || (updateData.clarityScore !== null && updateData.clarityScore < 0.8)) {
                  updateData.status = 'NEEDS_CLARIFICATION';
                  updateData.clarifyingQuestions = result?.questions ?? [
                    "What target system or environment does this intent apply to?",
                    "Could you clarify the exact actions or assets required?"
                  ];

                  await prisma.intent.update({ where: { id: params.id }, data: updateData });

                  await prisma.auditLog.create({
                    data: {
                      intentId: params.id,
                      userId: user.id,
                      action: 'NEED_CLARIFICATION',
                      stage: 5,
                      details: { questions: updateData.clarifyingQuestions },
                    },
                  });

                  sendEvent({
                    type: 'needs_clarification',
                    stage: 5,
                    stageName: STAGE_NAMES[5],
                    questions: updateData.clarifyingQuestions,
                    conversationalReply: result?.conversationalReply,
                    similarIntents: previousResults?.stage3?.similarIntents ?? [],
                  });
                  break;
                }
              } else if (stage === 6) {
                const outcome = result?.decisionOutcome;
                const validOutcomes = ['AUTO_APPROVED', 'NEEDS_CLARIFICATION', 'HUMAN_REVIEW_REQUIRED', 'CONDITIONAL_APPROVAL', 'REJECTED'];
                updateData.decisionOutcome = validOutcomes.includes(outcome) ? outcome : 'HUMAN_REVIEW_REQUIRED';
                updateData.evidenceQuality = typeof result?.evidenceQuality === 'number' ? result.evidenceQuality : null;
                updateData.policyCompliance = result?.policyCompliance ?? null;
                updateData.riskLevel = result?.riskLevel ?? null;
                updateData.delegationPolicy = result?.delegationPolicy ?? null;
                updateData.autonomyEligible = result?.autonomyEligible ?? null;
                updateData.decisionDetails = { reasoning: result?.reasoning ?? '', conditions: result?.conditions ?? [] };

                // Set status based on decision
                const statusMap: Record<string, string> = {
                  AUTO_APPROVED: 'APPROVED',
                  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
                  HUMAN_REVIEW_REQUIRED: 'UNDER_REVIEW',
                  CONDITIONAL_APPROVAL: 'CONDITIONAL_APPROVAL',
                  REJECTED: 'REJECTED',
                };
                updateData.status = statusMap[updateData.decisionOutcome] ?? 'UNDER_REVIEW';

                // Generate Intent ID for approved
                if (updateData.decisionOutcome === 'AUTO_APPROVED' || updateData.decisionOutcome === 'CONDITIONAL_APPROVAL') {
                  updateData.currentStage = 7;
                  const count = await prisma.intent.count({ where: { intentId: { not: null } } });
                  updateData.intentId = `INT-${String(count + 1).padStart(5, '0')}`;
                  updateData.approvedAt = new Date();
                }

                // Create review task if needed
                if (updateData.decisionOutcome === 'HUMAN_REVIEW_REQUIRED') {
                  const reviewers = await prisma.user.findMany({ where: { role: 'REVIEWER' }, take: 1 });
                  await prisma.reviewTask.create({
                    data: {
                      intentId: params.id,
                      assigneeId: reviewers?.[0]?.id ?? null,
                      slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
                      context: previousResults,
                    },
                  });
                }
              }

              await prisma.intent.update({ where: { id: params.id }, data: updateData });

              await prisma.auditLog.create({
                data: {
                  intentId: params.id,
                  userId: user.id,
                  action: `STAGE_${stage}_COMPLETED`,
                  stage,
                  details: result,
                },
              });

              sendEvent({
                type: 'stage_complete',
                stage,
                stageName: STAGE_NAMES[stage],
                data: result,
              });
            } catch (stageError: any) {
              sendEvent({
                type: 'error',
                stage,
                stageName: STAGE_NAMES[stage],
                message: stageError?.message ?? 'Stage processing failed',
              });
              
              // If a stage completely fails (e.g. LLM API failure), we MUST halt the pipeline
              // otherwise downstream stages will run with missing data and potentially auto-approve.
              await prisma.intent.update({
                where: { id: params.id },
                data: { status: 'REJECTED' },
              });
              
              throw stageError;
            }
          }

          // Fetch final intent state
          const finalIntent = await prisma.intent.findUnique({
            where: { id: params.id },
            include: { requester: { select: { name: true, email: true } } },
          });

          sendEvent({
            type: 'pipeline_complete',
            data: finalIntent,
          });
        } catch (error: any) {
          sendEvent({
            type: 'error',
            message: error?.message ?? 'Pipeline processing failed',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Process intent error:', error);
    return new Response(JSON.stringify({ error: 'Processing failed' }), { status: 500 });
  }
}
