import TypedEmitter from "typed-emitter";
import { EventEmitter } from "events";
import { Client, Library, PacketHook, UpdatePacket, Runtime, Classes, _Player, NewTickPacket, PlayerData, _Enemy, _Pet } from "nrelay";

// Event Declarations
interface PlayerTrackerEvents {
    playerEnter: (client: Client, player: _Player) => void,
    playerLeave: (client: Client, player: _Player) => void,
    playerUpdate: (client: Client, player: _Player) => void,

    enemyEnter: (client: Client, player: _Enemy) => void,
    enemyLeave: (client: Client, player: _Enemy) => void,
    enemyUpdate: (client: Client, player: _Enemy) => void,
    
    petEnter: (client: Client, player: _Pet) => void,
    petLeave: (client: Client, player: _Pet) => void,
    petUpdate: (client: Client, player: _Pet) => void,
}

@Library({
    name: "Entity Tracker",
    author: "Extacy",
    enabled: true
})
export class EntityTracker {

    private runtime: Runtime;
    public emitter: TypedEmitter<PlayerTrackerEvents>;

    public players: { [guid: string]: _Player[] };
    public enemies: { [guid: string]: _Enemy[] };
    public pets: { [guid: string]: _Pet[] };

    constructor(runtime: Runtime) {
        this.runtime = runtime;
        this.emitter = new EventEmitter();
        this.players = {};
        this.enemies = {};
        this.pets = {};
    }

    /**
     * Returns all tracked players, across all Clients.
     * Duplicate players are removed. (If a player is visible to multiple clients)
     */
    public getAllPlayers(): _Player[] {
        const players: _Player[] = [];

        for (const playerList of Object.values(this.players)) {
            for (const player of playerList) {
                if (players.find((value) => value.objectID == player.objectID)) continue;
                players.push(player);        
            }
        }

        return players;
    }

    /**
     * Returns all tracked players, across all Clients.
     * Duplicate players are removed. (If a player is visible to multiple clients)
     */
    public getAllEnemies(): _Enemy[] {
        const enemies: _Enemy[] = [];

        for (const enemyList of Object.values(this.enemies)) {
            for (const enemy of enemyList) {
                if (enemies.find((value) => value.objectID == enemy.objectID)) continue;
                enemies.push(enemy);        
            }
        }

        return enemies;
    }

    /**
     * Returns all tracked players, across all Clients.
     * Duplicate players are removed. (If a player is visible to multiple clients)
     */
    public getAllPets(): _Pet[] {
        const pets: _Pet[] = [];

        for (const playerList of Object.values(this.pets)) {
            for (const pet of playerList) {
                if (pets.find((value) => value.objectID == pet.objectID)) continue;
                pets.push(pet);        
            }
        }

        return pets;
    }

    @PacketHook()
    public onUpdate(client: Client, updatePacket: UpdatePacket): void {

        this.players[client.account.guid] ??= [];

        for (const newObject of updatePacket.newObjects) {

            // Players
            if (newObject.objectType in Classes) {
                const player = new _Player(newObject.status);
    
                // Update player if it already exists in our array
                const foundIndex = this.players[client.account.guid].findIndex((value) => value.name == player.name);
                if (foundIndex != -1) {
                    this.players[client.account.guid][foundIndex] = player;
                    this.emitter.emit("playerUpdate", client, player);
                    continue;
                }
    
                // Add new player
                this.players[client.account.guid].push(player);
                this.emitter.emit("playerEnter", client, player);
                continue;
            }

            // TODO:
            // * Enemies
            // * Pets
            // Update parsing objects in resources manager
        }

        for (const drop of updatePacket.drops) {
            // Remove players
            const foundIndex = this.players[client.account.guid].findIndex((value) => value.objectID == drop);
            if (foundIndex != -1) {
                const player = this.players[client.account.guid].splice(foundIndex, 1);
                this.emitter.emit("playerLeave", client, player[0]);
            }
        }
    }


    @PacketHook()
    public onNewTick(client: Client, newTickPacket: NewTickPacket): void {
        this.players[client.account.guid] ??= [];

        for (const status of newTickPacket.statuses) {
            const foundIndex = this.players[client.account.guid].findIndex((value) => value.objectID == status.objectId);
            if (foundIndex != -1) {
                this.players[client.account.guid][foundIndex].parseStatus(status);
                this.emitter.emit("playerUpdate", client, this.players[client.account.guid][foundIndex]);
            }
        }
    }
}