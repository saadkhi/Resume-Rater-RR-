/**
 * Job Listings Service with JobDataLake API Integration & Real-Time Resume Match Scoring
 */
import { db } from '../db/index.js';

export const jobsService = {
  /**
   * Search and filter jobs directly from the database with optional live resume match calculation.
   * Removes any arbitrary limit: all matching jobs stored in the database are returned.
   */
  async getJobs({ query = '', category = '', remoteOnly = false, resumeText = '', computeTfidfVector = null, rateResumeSimilarity = null } = {}) {
    // Retrieve all matching jobs directly from the database
    let filtered = db.jobs.list({ query, category, remoteOnly });

    // Compute dynamic vector match score if candidate resume text is available
    if (resumeText && computeTfidfVector && rateResumeSimilarity) {
      try {
        const resumeVec = computeTfidfVector(resumeText);
        filtered = filtered.map(job => {
          const jdFull = `${job.title} ${job.description} ${(job.skills || []).join(' ')}`;
          const jdVec = computeTfidfVector(jdFull);
          const { matchRating, similarityScore } = rateResumeSimilarity(resumeVec, jdVec);
          const percentage = Math.min(100, Math.round(similarityScore * 100));

          return {
            ...job,
            similarityScore: Number(similarityScore.toFixed(2)),
            matchPercentage: percentage,
            matchRating
          };
        });

        // Sort by match score descending when resume is provided
        filtered.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
      } catch (err) {
        console.warn('Job match scoring error:', err.message);
      }
    }

    return {
      success: true,
      totalCount: filtered.length,
      jobs: filtered,
      source: 'JobDataLake API & Career Intelligence Database',
      hasResumeMatch: !!resumeText
    };
  }
};
