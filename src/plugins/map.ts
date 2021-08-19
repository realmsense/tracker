import { Client, Library, PacketHook, TextPacket, PlayerTextPacket, PlayerData, MapInfoPacket, MapInfo, UpdatePacket, Runtime, Logger, LogLevel, WorldPosData, TileXML } from "nrelay";

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

    constructor(runtime: Runtime) {
        this.runtime = runtime;
        this.tileMap = {};
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
    }
}