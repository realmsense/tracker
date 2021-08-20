import { Client, Library, PacketHook, MapInfoPacket, UpdatePacket, Runtime, Logger, LogLevel, WorldPosData, TileXML, ObjectXML, MapObject } from "nrelay";

@Library({
    name: "Map",
    author: "Extacy",
    enabled: true
})
export class MapPlugin {

    private runtime: Runtime;

    public mapInfo: Omit<MapInfoPacket, "read" | "write">;
    
    public tileMap: {
        [x: number]: {
            [y: number]: TileXML
        }
    }

    public portals: MapObject[];

    constructor(runtime: Runtime) {
        this.runtime = runtime;
        this.tileMap = {};
        this.portals = [];
    }

    @PacketHook()
    public onMapInfo(client: Client, mapInfoPacket: MapInfoPacket): void {
        this.mapInfo = mapInfoPacket;
    }

    @PacketHook()
    public onUpdate(client: Client, updatePacket: UpdatePacket): void {

        // tiles
        for (const newTile of updatePacket.tiles) {
            const tile = this.runtime.resources.tiles[newTile.type];
            if (!tile) {
                Logger.log("Map", `Could not find Tile with type ${newTile.type}`, LogLevel.Warning);
                continue;
            }
            
            this.tileMap[newTile.x] ??= {};
            this.tileMap[newTile.x][newTile.y] = tile;
            this.runtime.env.writeJSON(this.tileMap, "src/nrelay/test/tilemap.json");
        }

        for (const newObject of updatePacket.newObjects) {
            const portalXML = this.runtime.resources.portals[newObject.objectType];
            if (!portalXML) continue;

            const object: MapObject = {
                ...portalXML,
                objectId: newObject.status.objectId,
                pos: newObject.status.pos,
                name: portalXML.dungeonName || portalXML.displayId || portalXML.id
            };

            this.portals.push(object);
            this.runtime.env.writeJSON(this.portals, "src/nrelay/test/objects.json");
        }
    }
}