const families=[
  ['claude',/claude|sonnet|opus|haiku/i,'Claude'],
  ['openai',/gpt|codex|(?:^|[\s/:_-])o[134](?:$|[\s._/-])/i,'OpenAI'],
  ['gemini',/gemini|gemma/i,'Google'],
  ['deepseek',/deepseek/i,'DeepSeek'],
  ['qwen',/qwen|qwq/i,'Qwen'],
  ['mistral',/mistral|mixtral|codestral|devstral|ministral|magistral/i,'Mistral'],
  ['grok',/grok/i,'xAI'],
  ['meta',/llama/i,'Meta'],
];
export function modelBrand(model={}){
  const identity=[model.id,model.name].filter(Boolean).join(' ');
  let match=families.find(([,pattern])=>pattern.test(identity));
  if(!match){const provider=String(model.provider||'');match=families.find(([id])=>provider.toLowerCase().includes(id));if(!match&&/anthropic/i.test(provider))match=families[0];}
  return match?{id:match[0],name:match[2]}:null;
}
