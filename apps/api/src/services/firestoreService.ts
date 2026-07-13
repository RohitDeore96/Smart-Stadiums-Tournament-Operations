/**
 * @file apps/api/src/services/firestoreService.ts
 * @description Typed data access layer over Firestore. Every read/write
 *   goes through here so we can:
 *   - Enforce consistent pagination
 *   - Add typing to Firestore docs
 *   - Centralize error handling
 *   - Add observability (logging slow queries)
 *
 *   NO other module should import firebase-admin directly.
 */

import type { QuerySnapshot, DocumentSnapshot, Query } from 'firebase-admin/firestore';
import { getFirestore } from '../config/firebase.js';
import { scopedLogger } from '../utils/logger.js';
import { NotFoundError, UpstreamUnavailableError } from '../utils/errors.js';

const log = scopedLogger('firestore');

export interface PaginationOptions {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Encodes a Firestore document snapshot into an opaque cursor string.
 * The cursor is the document ID — callers pass it back as `?cursor=`.
 */
function encodeCursor(docId: string): string {
  return Buffer.from(docId).toString('base64url');
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

/**
 * Generic paginated query helper. Applies cursor-based pagination to any
 * collection ordered by document ID.
 *
 * @param collectionPath - Firestore collection path
 * @param options - Pagination options
 * @param filters - Optional array of where-clause filters
 * @param orderBy - Optional field to order by (default: document ID)
 * @param orderDir - Optional order direction (default: 'asc')
 */
export async function queryPaginated<T>(
  collectionPath: string,
  options: PaginationOptions,
  filters: { field: string; op: '==' | 'in' | '!='; value: unknown }[] = [],
  orderBy?: string,
  orderDir: 'asc' | 'desc' = 'asc',
): Promise<PaginatedResult<T>> {
  const db = getFirestore();
  let query: Query = db.collection(collectionPath);

  for (const filter of filters) {
    query = query.where(filter.field, filter.op, filter.value);
  }

  if (orderBy) {
    query = query.orderBy(orderBy, orderDir);
  } else {
    query = query.orderBy('__name__', orderDir);
  }

  // Cursor pagination: start after the decoded document ID
  if (options.cursor) {
    try {
      const docId = decodeCursor(options.cursor);
      const cursorDoc = await db.collection(collectionPath).doc(docId).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    } catch {
      log.warn({ cursor: options.cursor.slice(0, 16) }, 'Invalid cursor — ignoring');
    }
  }

  // Fetch limit + 1 to determine hasMore
  query = query.limit(options.limit + 1);

  let snapshot: QuerySnapshot;
  try {
    snapshot = await query.get();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message, collection: collectionPath }, 'Firestore query failed');
    throw UpstreamUnavailableError('Firestore');
  }

  const docs = snapshot.docs;
  const hasMore = docs.length > options.limit;
  const items = (hasMore ? docs.slice(0, options.limit) : docs).map((doc: DocumentSnapshot) => ({
    id: doc.id,
    ...doc.data(),
  })) as unknown as T[];

  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor((items[items.length - 1] as { id: string }).id)
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * Fetches a single document by ID. Throws NotFoundError if missing.
 */
export async function getDoc<T>(collectionPath: string, docId: string): Promise<T> {
  const db = getFirestore();
  let snapshot: DocumentSnapshot;

  try {
    snapshot = await db.collection(collectionPath).doc(docId).get();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message, collection: collectionPath, docId }, 'Firestore get failed');
    throw UpstreamUnavailableError('Firestore');
  }

  if (!snapshot.exists) {
    throw NotFoundError(collectionPath);
  }

  return { id: snapshot.id, ...snapshot.data() } as unknown as T;
}

/**
 * Creates a document with a server-generated ID.
 * Returns the created document with its ID.
 */
export async function createDoc<T extends Record<string, unknown>>(
  collectionPath: string,
  data: T,
): Promise<T & { id: string; createdAt: string; updatedAt: string }> {
  const db = getFirestore();
  const now = new Date().toISOString();
  const docWithTimestamps = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = await db.collection(collectionPath).add(docWithTimestamps);
    log.info({ collection: collectionPath, docId: ref.id }, 'Document created');
    return { ...docWithTimestamps, id: ref.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message, collection: collectionPath }, 'Firestore create failed');
    throw UpstreamUnavailableError('Firestore');
  }
}

/**
 * Updates a document. Throws NotFoundError if missing.
 */
export async function updateDoc<T extends Record<string, unknown>>(
  collectionPath: string,
  docId: string,
  updates: Partial<T>,
): Promise<T & { id: string; updatedAt: string }> {
  const db = getFirestore();

  // Verify existence first
  const existing = await getDoc<T & { id: string }>(collectionPath, docId);

  const updatesWithTimestamp = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.collection(collectionPath).doc(docId).update(updatesWithTimestamp);
    log.info({ collection: collectionPath, docId }, 'Document updated');
    return { ...existing, ...updatesWithTimestamp };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message, collection: collectionPath, docId }, 'Firestore update failed');
    throw UpstreamUnavailableError('Firestore');
  }
}
