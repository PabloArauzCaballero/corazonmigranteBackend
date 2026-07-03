import { ContentAuthor, ContentCategory, ContentPublication, ContentTag } from '@/database/models';

export function toCategoryDto(category: ContentCategory) {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  };
}

export function toTagDto(tag: ContentTag) {
  return { id: tag.id, slug: tag.slug, name: tag.name };
}

export function toAuthorDto(author: ContentAuthor) {
  return {
    id: author.id,
    userId: author.userId,
    displayName: author.displayName,
    headline: author.headline,
    bio: author.bio,
    avatarFileId: author.avatarFileId,
    status: author.status,
    metadata: author.metadata,
  };
}

export function toPublicationCard(publication: ContentPublication) {
  return {
    id: publication.id,
    slug: publication.slug,
    title: publication.title,
    summary: publication.summary,
    publicationType: publication.publicationType,
    accessType: publication.accessType,
    status: publication.status,
    publishedAt: publication.publishedAt,
    scheduledAt: publication.scheduledAt,
    category: publication.category ? toCategoryDto(publication.category) : undefined,
    author: publication.author ? toAuthorDto(publication.author) : undefined,
    coverFileId: publication.coverFileId,
    tags: publication.tags?.map(toTagDto) ?? [],
  };
}

export function toPublicationDetail(publication: ContentPublication, includeBody = true) {
  return {
    ...toPublicationCard(publication),
    body: includeBody ? publication.body : undefined,
    audioTranscript: includeBody ? publication.audioTranscript : undefined,
    commentsEnabled: publication.commentsEnabled,
    reactionsEnabled: publication.reactionsEnabled,
    seoMetadata: publication.seoMetadata,
  };
}
