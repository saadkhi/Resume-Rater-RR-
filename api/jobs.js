/**
 * Vercel Serverless Function: /api/jobs
 * Retrieves all jobs from the database (removing the 12-job limit)
 * and returns full listings with optional filtering and match scoring.
 */
import '../src/polyfills.js';
import { db } from '../src/db/index.js';
import { jobsService } from '../src/services/jobs.js';
import app, { computeTfidfVector, rateResumeSimilarity } from '../server.js';

export default async function handler(req, res) {
  try {
    const method = req.method || 'GET';
    if (method === 'GET' || method === 'POST') {
      const query = req.body?.query || req.query?.query || '';
      const category = req.body?.category || req.query?.category || '';
      const remote = req.body?.remote !== undefined 
        ? req.body.remote 
        : (req.query?.remote === 'true' || req.query?.remote === true);
      const resumeText = req.body?.resumeText || req.query?.resumeText || '';

      const result = await jobsService.getJobs({
        query,
        category,
        remoteOnly: remote === 'true' || remote === true,
        resumeText,
        computeTfidfVector: typeof computeTfidfVector === 'function' ? computeTfidfVector : null,
        rateResumeSimilarity: typeof rateResumeSimilarity === 'function' ? rateResumeSimilarity : null
      });

      if (res.json) {
        return res.json(result);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(result));
    }

    return app(req, res);
  } catch (err) {
    console.error('API /api/jobs error:', err);
    try {
      return app(req, res);
    } catch (fallbackErr) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          success: false, 
          error: 'An unexpected error occurred while fetching jobs from database.' 
        }));
      }
    }
  }
}
