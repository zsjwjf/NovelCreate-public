

export interface Storyline {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface EventType {
  id: string;
  name:string;
  color: string;
}

export interface StoryEvent {
  id: string;
  title: string;
  date: string;
  storylineId: string | null;
  typeId: string | null;
  description: string;
  charactersInvolved: string[];
  // Temporary property used when creating a new event by dragging from another event.
  __connectFrom?: string;
}

export interface EventConnection {
  id: string;
  fromEventId: string;
  toEventId: string;
  description: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
}

export type RelationshipDirection = 'forward' | 'backward' | 'bidirectional';

export interface CharacterRelationship {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  relationshipType: string;
  direction: RelationshipDirection;
}

export interface CharacterGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  characterIds: string[];
}

export type ViewType = 'timeline' | 'characters';

export interface ScriptData {
  storylines: Storyline[];
  eventTypes: EventType[];
  events: StoryEvent[];
  eventConnections: EventConnection[];
  characters: Character[];
  characterRelationships: CharacterRelationship[];
  characterGroups: CharacterGroup[];
  eraOrder: string[];
}

export interface Script {
  id: string;
  name: string;
  data: ScriptData;
}

interface AiVendorSettings {
  model: string;
  systemPrompt: string;
  apiKey: string;
  baseUrl: string;
  advanced: {
    temperature: number;
    topP: number;
    topK?: number; // Optional, as not all vendors use it
    maxOutputTokens: number;
  };
}

export interface AppSettings {
  ai: {
    enabled: boolean;
    activeVendor: 'gemini' | 'openai';
    vendors: {
      gemini: AiVendorSettings;
      openai: AiVendorSettings;
    };
  };
}
