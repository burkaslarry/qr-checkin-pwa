export interface CheckInRecord {
    name: string;
    type: 'guest' | 'member';
    timestamp: string; // ISO string
}

export interface EventData {
    eventName: string;
    date: string;
    id: string;
}

export interface CheckInPayload {
    name: string;
    type: 'guest' | 'member';
    currentTime: string;
}

export interface MemberResponse {
    members: string[];
}

export interface RecordsResponse {
    records: CheckInRecord[];
}

export interface WebSocketMessage {
    type: string;
    data: any;
}

export interface AppState {
    socket: WebSocket | null;
    scanner: any | null; // Html5Qrcode type is complex, using any for now or specific type if imported
    currentEvent: EventData | null;
    records: CheckInRecord[];
}

