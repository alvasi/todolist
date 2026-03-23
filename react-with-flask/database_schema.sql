-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    alias VARCHAR(100) NOT NULL,
    user_colour VARCHAR(7) DEFAULT '#000000',
    personal_team_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name VARCHAR(100) NOT NULL,
    team_description TEXT,
    is_personal BOOLEAN DEFAULT FALSE,
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Team members
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (team_role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Tasks (with updated_by_id)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    task_description TEXT,
    due_date DATE,
    task_status VARCHAR(50) NOT NULL DEFAULT 'not_started' CHECK (task_status IN ('not_started', 'in_progress', 'completed', 'archived')),
    task_priority VARCHAR(20) DEFAULT 'medium' CHECK (task_priority IN ('low', 'medium', 'high', 'urgent')),
    is_private BOOLEAN DEFAULT FALSE,
    created_by_id UUID NOT NULL REFERENCES users(id),
    updated_by_id UUID REFERENCES users(id),  -- Last user who updated the task
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task collaborators
CREATE TABLE task_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    added_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, user_id)
);

-- Add foreign key for personal_team_id after teams table exists
ALTER TABLE users 
ADD CONSTRAINT fk_users_personal_team 
FOREIGN KEY (personal_team_id) 
REFERENCES teams(id) ON DELETE SET NULL;

-- Create indexes for performance
-- CREATE INDEX idx_users_username ON users(username);
-- CREATE INDEX idx_users_personal_team ON users(personal_team_id);
-- CREATE INDEX idx_teams_is_personal ON teams(is_personal);
-- CREATE INDEX idx_teams_created_by ON teams(created_by_id);
-- CREATE INDEX idx_team_members_team_id ON team_members(team_id);
-- CREATE INDEX idx_team_members_user_id ON team_members(user_id);
-- CREATE INDEX idx_tasks_team_id ON tasks(team_id);
-- CREATE INDEX idx_tasks_created_by ON tasks(created_by_id);
-- CREATE INDEX idx_tasks_updated_by ON tasks(updated_by_id);
-- CREATE INDEX idx_tasks_status ON tasks(task_status);
-- CREATE INDEX idx_tasks_due_date ON tasks(due_date);
-- CREATE INDEX idx_tasks_updated_at ON tasks(updated_at);
-- CREATE INDEX idx_tasks_is_private ON tasks(is_private);
-- CREATE INDEX idx_task_collaborators_task_id ON task_collaborators(task_id);
-- CREATE INDEX idx_task_collaborators_user_id ON task_collaborators(user_id);

-- Auto-update trigger for tasks
CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_timestamp
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_timestamp();