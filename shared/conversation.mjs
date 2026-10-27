// Conversation messages are exercise data, never instructions or permissions.
export function conversationHistory(value = []) {
  if (!Array.isArray(value) || value.length > 10 || value.length % 2 !== 0) throw new Error('Use at most five completed conversation exchanges, then start a new practice.');
  return value.map((message, index) => {
    const role = index % 2 === 0 ? 'user' : 'assistant';
    if (!message || message.role !== role || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 1500) throw new Error('Invalid conversation history. Start a new practice.');
    return {role, content: message.content.trim()};
  });
}

export function conversationReply(value) {
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error('The tutor returned an unreadable reply. Please try again.'); }
  if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim() || parsed.reply.length > 1000 ||
      typeof parsed.explanation !== 'string' || !parsed.explanation.trim() || parsed.explanation.length > 1500) throw new Error('The tutor returned an incomplete reply. Please try again.');
  return {reply: parsed.reply.trim(), explanation: parsed.explanation.trim()};
}
