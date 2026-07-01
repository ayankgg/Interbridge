import {
  Model,
  Document,
  FilterQuery,
  UpdateQuery,
  ProjectionType,
  QueryOptions,
} from 'mongoose';

/**
 * Generic data-access abstraction (Repository Pattern).
 *
 * Services depend on this thin interface rather than on Mongoose directly,
 * which keeps business logic persistence-agnostic (Dependency Inversion) and
 * makes services trivially mockable in unit tests. Concrete repositories
 * extend this and add domain-specific queries.
 */
export abstract class BaseRepository<T extends Document> {
  protected constructor(protected readonly model: Model<T>) {}

  create(data: Partial<T>): Promise<T> {
    return this.model.create(data) as unknown as Promise<T>;
  }

  findById(id: string, projection?: ProjectionType<T>): Promise<T | null> {
    return this.model.findById(id, projection).exec();
  }

  findOne(filter: FilterQuery<T>, projection?: ProjectionType<T>): Promise<T | null> {
    return this.model.findOne(filter, projection).exec();
  }

  find(
    filter: FilterQuery<T>,
    projection?: ProjectionType<T>,
    options?: QueryOptions<T>
  ): Promise<T[]> {
    return this.model.find(filter, projection, options).exec();
  }

  count(filter: FilterQuery<T>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  updateById(id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, update, { new: true }).exec();
  }

  updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>): Promise<number> {
    return this.model.updateMany(filter, update).exec().then((r) => r.modifiedCount);
  }

  deleteOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOneAndDelete(filter).exec();
  }

  /** Offset pagination helper returning items + total in one round-trip pair. */
  async paginate(
    filter: FilterQuery<T>,
    opts: { skip: number; limit: number; sort?: Record<string, 1 | -1>; projection?: ProjectionType<T> }
  ): Promise<{ items: T[]; total: number }> {
    // Append _id as a tiebreaker so documents sharing a sort key (e.g. equal
    // createdAt) have a stable, total order and don't repeat/skip across pages.
    const sort = { ...(opts.sort ?? { createdAt: -1 }), _id: -1 as const };
    const [items, total] = await Promise.all([
      this.model
        .find(filter, opts.projection)
        .sort(sort)
        .skip(opts.skip)
        .limit(opts.limit)
        .lean<T[]>()
        .exec() as unknown as Promise<T[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}
