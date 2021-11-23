import { Server, Portal, timestamp } from "nrelay";
import { IRealm } from "../../../../shared/src";

export class Realm extends Portal implements IRealm {
    public server: Server;
    public players: number;
    public maxPlayers: number;

    public queue: number;
    public updatedTime: number;

    // requires available bot
    public ip?: string;
    public heroesLeft?: number;

    protected constructor() {
        super();
    }

    public static parseRealmPortal(portal: Portal): Realm | null {
        const pattern = /NexusPortal\.(\w+) \((\d+)\/(\d+)\)(?: \(\+(\d+)\))?/;
        const match = portal.name.match(pattern);
        if (!match) return null;

        const realm = new Realm();
        realm.parseObjectStatus(portal.status);
        realm.name        = match[1];
        realm.players     = parseInt(match[2]);
        realm.maxPlayers  = parseInt(match[3]);
        realm.queue       = (match[4] ? parseInt(match[4]) : 0);
        realm.updatedTime = timestamp();
        return realm;
    }
}