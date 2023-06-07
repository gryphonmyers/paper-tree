declare namespace PaperTree {

    export type Task = {
        path: string;

    }

    export interface ITaskHandler {
        handle(task: Task): Promise<void>
    }

    export type RouteParam = {

    }

    export interface Route {
        params: Record<string, RouteParam>;
        name: string;

        iterate(): Promise<void>
    }

    export interface RoutesProvider {

    }

    export interface OutputHandler {

    }

    export interface DataProvider {
        getRouteIterationIdentifiers(param: RouteParam, routeName: string): Promise<string[]>;
        getRouteData(routeName: string, params: Record<string, any>): Promise<any>;
    }

    export interface Renderer {

    }

    export interface SiteGenerator {
        buildPath(path: string): Promise<void>;
        buildAllPaths(path: string): Promise<void>;
    }
}