const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Activity types
const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'proposal', 'follow_up', 'other'];
const CONTACT_METHODS = ['phone', 'email', 'in_person', 'video_call', 'text', 'other'];
const OUTCOMES = ['positive', 'neutral', 'negative', 'no_answer', 'callback_requested', 'meeting_scheduled'];

// Get all conversations for an entity (lead, pipeline, client, or company)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { lead_id, pipeline_id, client_id, company_id, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT c.*, u.name as created_by_name
      FROM conversations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (lead_id) {
      query += ' AND c.lead_id = ?';
      params.push(lead_id);
    }
    if (pipeline_id) {
      query += ' AND c.pipeline_id = ?';
      params.push(pipeline_id);
    }
    if (client_id) {
      query += ' AND c.client_id = ?';
      params.push(client_id);
    }
    if (company_id) {
      query += ' AND c.company_id = ?';
      params.push(company_id);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const conversations = db.prepare(query).all(...params);
    
    // Get total count
    const countQuery = query.replace('SELECT c.*, u.name as created_by_name', 'SELECT COUNT(*) as total')
      .replace(' ORDER BY c.created_at DESC LIMIT ? OFFSET ?', '');
    const total = db.prepare(countQuery).get(...params.slice(0, -2)).total;

    res.json({ conversations, total });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get full conversation history for a contact (across all stages)
router.get('/history', authenticateToken, (req, res) => {
  try {
    const { lead_id, pipeline_id, client_id, company_id } = req.query;
    
    // Build a query that gets all related conversations
    // If we have a client_id, also get conversations from their pipeline and lead stages
    let query = `
      SELECT c.*, u.name as created_by_name,
        CASE 
          WHEN c.client_id IS NOT NULL THEN 'client'
          WHEN c.pipeline_id IS NOT NULL THEN 'pipeline'
          WHEN c.lead_id IS NOT NULL THEN 'lead'
          ELSE 'general'
        END as stage
      FROM conversations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=0
    `;
    const params = [];

    if (lead_id) {
      query += ' OR c.lead_id = ?';
      params.push(lead_id);
    }
    if (pipeline_id) {
      query += ' OR c.pipeline_id = ?';
      params.push(pipeline_id);
      
      // Also get conversations from linked lead
      const deal = db.prepare('SELECT lead_id FROM pipeline WHERE id = ?').get(pipeline_id);
      if (deal?.lead_id) {
        query += ' OR c.lead_id = ?';
        params.push(deal.lead_id);
      }
    }
    if (client_id) {
      query += ' OR c.client_id = ?';
      params.push(client_id);
    }
    if (company_id) {
      query += ' OR c.company_id = ?';
      params.push(company_id);
    }

    query += ' ORDER BY c.created_at DESC';

    const conversations = db.prepare(query).all(...params);
    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// Create a new conversation/activity
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      lead_id,
      pipeline_id,
      client_id,
      company_id,
      activity_type = 'note',
      title,
      content,
      contact_method,
      outcome,
      next_steps,
      follow_up_date
    } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!lead_id && !pipeline_id && !client_id && !company_id) {
      return res.status(400).json({ error: 'At least one entity ID is required' });
    }

    const result = db.prepare(`
      INSERT INTO conversations (
        lead_id, pipeline_id, client_id, company_id,
        activity_type, title, content, contact_method,
        outcome, next_steps, follow_up_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      lead_id || null,
      pipeline_id || null,
      client_id || null,
      company_id || null,
      activity_type,
      title || null,
      content,
      contact_method || null,
      outcome || null,
      next_steps || null,
      follow_up_date || null,
      req.user.userId
    );

    const newConversation = db.prepare(`
      SELECT c.*, u.name as created_by_name
      FROM conversations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update conversation
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const {
      activity_type,
      title,
      content,
      contact_method,
      outcome,
      next_steps,
      follow_up_date
    } = req.body;

    const result = db.prepare(`
      UPDATE conversations SET
        activity_type = COALESCE(?, activity_type),
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        contact_method = COALESCE(?, contact_method),
        outcome = COALESCE(?, outcome),
        next_steps = COALESCE(?, next_steps),
        follow_up_date = COALESCE(?, follow_up_date)
      WHERE id = ?
    `).run(
      activity_type,
      title,
      content,
      contact_method,
      outcome,
      next_steps,
      follow_up_date,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updated = db.prepare(`
      SELECT c.*, u.name as created_by_name
      FROM conversations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Link conversation to new entity (when converting lead → pipeline → client)
router.post('/:id/link', authenticateToken, (req, res) => {
  try {
    const { pipeline_id, client_id, company_id } = req.body;

    const updates = [];
    const params = [];

    if (pipeline_id) {
      updates.push('pipeline_id = ?');
      params.push(pipeline_id);
    }
    if (client_id) {
      updates.push('client_id = ?');
      params.push(client_id);
    }
    if (company_id) {
      updates.push('company_id = ?');
      params.push(company_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No entity to link' });
    }

    params.push(req.params.id);

    db.prepare(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('Error linking conversation:', error);
    res.status(500).json({ error: 'Failed to link conversation' });
  }
});

// Bulk link all conversations from one entity to another
router.post('/bulk-link', authenticateToken, (req, res) => {
  try {
    const { from_lead_id, from_pipeline_id, to_pipeline_id, to_client_id, to_company_id } = req.body;

    let whereClause = '';
    const whereParams = [];

    if (from_lead_id) {
      whereClause = 'lead_id = ?';
      whereParams.push(from_lead_id);
    } else if (from_pipeline_id) {
      whereClause = 'pipeline_id = ?';
      whereParams.push(from_pipeline_id);
    } else {
      return res.status(400).json({ error: 'Source entity required' });
    }

    const updates = [];
    const updateParams = [];

    if (to_pipeline_id) {
      updates.push('pipeline_id = ?');
      updateParams.push(to_pipeline_id);
    }
    if (to_client_id) {
      updates.push('client_id = ?');
      updateParams.push(to_client_id);
    }
    if (to_company_id) {
      updates.push('company_id = ?');
      updateParams.push(to_company_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Target entity required' });
    }

    const result = db.prepare(`
      UPDATE conversations SET ${updates.join(', ')} WHERE ${whereClause}
    `).run(...updateParams, ...whereParams);

    res.json({ message: `Linked ${result.changes} conversations` });
  } catch (error) {
    console.error('Error bulk linking:', error);
    res.status(500).json({ error: 'Failed to bulk link conversations' });
  }
});

// Get activity types and options for dropdowns
router.get('/options', authenticateToken, (req, res) => {
  res.json({
    activity_types: ACTIVITY_TYPES,
    contact_methods: CONTACT_METHODS,
    outcomes: OUTCOMES
  });
});

// Get complete customer journey timeline (Lead → Pipeline → Client)
router.get('/journey/:entityType/:entityId', authenticateToken, (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    let journey = {
      stages: [],
      conversations: [],
      milestones: [],
      analytics: {}
    };

    // Determine the starting point and trace the journey
    if (entityType === 'lead') {
      const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(entityId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      journey.stages.push({
        stage: 'lead',
        entity_id: lead.id,
        entity_type: 'lead',
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        status: lead.status,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      });

      // Check if lead was converted to pipeline
      const pipeline = db.prepare('SELECT * FROM pipeline WHERE lead_id = ?').get(entityId);
      if (pipeline) {
        journey.stages.push({
          stage: 'pipeline',
          entity_id: pipeline.id,
          entity_type: 'pipeline',
          deal_name: pipeline.deal_name,
          deal_value: pipeline.deal_value,
          stage: pipeline.stage,
          probability: pipeline.probability,
          created_at: pipeline.created_at,
          updated_at: pipeline.updated_at
        });

        // Check if pipeline was converted to client
        const client = db.prepare('SELECT c.*, comp.name as company_name FROM clients c LEFT JOIN companies comp ON c.company_id = comp.id WHERE c.id IN (SELECT id FROM clients WHERE id IN (SELECT client_id FROM pipeline WHERE id = ?))').get(pipeline.id);
        if (client) {
          journey.stages.push({
            stage: 'client',
            entity_id: client.id,
            entity_type: 'client',
            client_name: `${client.first_name} ${client.last_name}`,
            company_name: client.company_name,
            created_at: client.created_at,
            updated_at: client.updated_at
          });
        }
      }
    } else if (entityType === 'pipeline') {
      const pipeline = db.prepare('SELECT * FROM pipeline WHERE id = ?').get(entityId);
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      // Check if there was a lead before
      if (pipeline.lead_id) {
        const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(pipeline.lead_id);
        if (lead) {
          journey.stages.push({
            stage: 'lead',
            entity_id: lead.id,
            entity_type: 'lead',
            company_name: lead.company_name,
            contact_name: lead.contact_name,
            status: lead.status,
            created_at: lead.created_at,
            updated_at: lead.updated_at
          });
        }
      }

      journey.stages.push({
        stage: 'pipeline',
        entity_id: pipeline.id,
        entity_type: 'pipeline',
        deal_name: pipeline.deal_name,
        deal_value: pipeline.deal_value,
        stage: pipeline.stage,
        probability: pipeline.probability,
        created_at: pipeline.created_at,
        updated_at: pipeline.updated_at
      });
    } else if (entityType === 'client') {
      const client = db.prepare('SELECT c.*, comp.name as company_name FROM clients c LEFT JOIN companies comp ON c.company_id = comp.id WHERE c.id = ?').get(entityId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      journey.stages.push({
        stage: 'client',
        entity_id: client.id,
        entity_type: 'client',
        client_name: `${client.first_name} ${client.last_name}`,
        company_name: client.company_name,
        created_at: client.created_at,
        updated_at: client.updated_at
      });
    }

    // Get all conversations across all stages
    const entityIds = journey.stages.map(s => s.entity_id);
    if (entityIds.length > 0) {
      const conversations = db.prepare(`
        SELECT c.*, u.name as created_by_name,
          CASE
            WHEN c.client_id IS NOT NULL THEN 'client'
            WHEN c.pipeline_id IS NOT NULL THEN 'pipeline'
            WHEN c.lead_id IS NOT NULL THEN 'lead'
            ELSE 'general'
          END as stage
        FROM conversations c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.lead_id IN (${entityIds.join(',')})
           OR c.pipeline_id IN (${entityIds.join(',')})
           OR c.client_id IN (${entityIds.join(',')})
        ORDER BY c.created_at ASC
      `).all();

      journey.conversations = conversations;

      // Calculate analytics
      journey.analytics = {
        total_interactions: conversations.length,
        interaction_types: conversations.reduce((acc, conv) => {
          acc[conv.activity_type] = (acc[conv.activity_type] || 0) + 1;
          return acc;
        }, {}),
        outcomes: conversations.filter(c => c.outcome).reduce((acc, conv) => {
          acc[conv.outcome] = (acc[conv.outcome] || 0) + 1;
          return acc;
        }, {}),
        time_in_each_stage: journey.stages.map(stage => ({
          stage: stage.stage,
          days: stage.updated_at && stage.created_at
            ? Math.floor((new Date(stage.updated_at) - new Date(stage.created_at)) / (1000 * 60 * 60 * 24))
            : 0
        })),
        total_journey_days: journey.stages.length > 0
          ? Math.floor((new Date() - new Date(journey.stages[0].created_at)) / (1000 * 60 * 60 * 24))
          : 0
      };
    }

    res.json(journey);
  } catch (error) {
    console.error('Error fetching customer journey:', error);
    res.status(500).json({ error: 'Failed to fetch customer journey' });
  }
});

module.exports = router;
