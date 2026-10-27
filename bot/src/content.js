// Lee el contenido de un mensaje de WhatsApp: texto, tipo, fotos, enlaces.
import { normalizeMessageContent, getContentType } from 'baileys';

// Tipos que no son "publicaciones" (reacciones, avisos internos, votos, etc.).
const IGNORED_TYPES = new Set([
  'protocolMessage',
  'reactionMessage',
  'pollUpdateMessage',
  'keepInChatMessage',
  'pinInChatMessage',
  'encReactionMessage',
  'encEventResponseMessage',
  'senderKeyDistributionMessage',
  'messageHistoryBundle',
  'messageHistoryNotice',
]);

const KIND_BY_TYPE = {
  conversation: 'texto',
  extendedTextMessage: 'texto',
  imageMessage: 'imagen',
  videoMessage: 'video',
  documentMessage: 'documento',
  audioMessage: 'audio',
  stickerMessage: 'sticker',
  locationMessage: 'ubicacion',
  liveLocationMessage: 'ubicacion',
  contactMessage: 'contacto',
  contactsArrayMessage: 'contacto',
  pollCreationMessage: 'encuesta',
  pollCreationMessageV2: 'encuesta',
  pollCreationMessageV3: 'encuesta',
  albumMessage: 'album',
};

/**
 * Resume un mensaje en algo fácil de revisar.
 * @returns {{ type, kind, text, isImage, isAlbumHeader, expectedImages, albumParentId, isReply, ignored }}
 */
export function describeMessage(rawMessage) {
  const content = normalizeMessageContent(rawMessage) ?? {};
  const type = getContentType(content);
  const inner = type ? content[type] : undefined;

  const text = [
    typeof inner === 'string' ? inner : null,
    inner?.text,
    inner?.caption,
    inner?.matchedText,
    inner?.canonicalUrl,
    inner?.title,
    inner?.description,
    inner?.name, // nombre de encuesta / ubicación
    inner?.fileName,
    inner?.url && type === 'locationMessage' ? inner.url : null,
  ]
    .filter((x) => typeof x === 'string' && x.trim())
    .join('\n');

  const ctx = inner?.contextInfo;
  const association =
    rawMessage?.messageContextInfo?.messageAssociation ??
    content?.messageContextInfo?.messageAssociation ??
    rawMessage?.associatedChildMessage?.message?.messageContextInfo?.messageAssociation;

  return {
    type: type ?? 'desconocido',
    kind: KIND_BY_TYPE[type] ?? 'otro',
    text,
    isImage: type === 'imageMessage',
    isAlbumHeader: type === 'albumMessage',
    expectedImages: type === 'albumMessage' ? Number(inner?.expectedImageCount ?? 0) : 0,
    albumParentId: association?.parentMessageKey?.id ?? null,
    isReply: Boolean(ctx?.quotedMessage || ctx?.stanzaId),
    ignored: !type || IGNORED_TYPES.has(type),
  };
}

/** Si el mensaje es una edición, devuelve { key, text } del mensaje editado; si no, null. */
export function describeEdit(rawMessage) {
  const proto = rawMessage?.protocolMessage ?? rawMessage?.editedMessage?.message?.protocolMessage;
  if (!proto || proto.type !== 14 || !proto.editedMessage || !proto.key) return null;
  return { key: proto.key, text: describeMessage(proto.editedMessage).text };
}

/** Fragmento corto para el registro. */
export function excerpt(text, max = 200) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
