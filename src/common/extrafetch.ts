/* eslint-disable @typescript-eslint/no-explicit-any */

import fetch, * as rawfetch from 'node-fetch';
import FormData from 'form-data';

export type ResponseType = 'basic' | 'cors' | 'default' | 'error' | 'opaque' | 'opaqueredirect';
export type HeadersType = Record<string, any>;

export type BodyType = {
    json?: any,
    form?: any,
    query?: any,
};

export type Options = {
    /** (default = true) support gzip/deflate content encoding. false to disable */
    compress?: boolean;
    /** (default = 20) maximum redirect count. 0 to not follow redirect */
    follow?: number;
    /** (default = 0) maximum response body size in bytes. 0 to disable */
    size?: number;
    /** (default = 0) req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies) */
    timeout?: number;
    /** The request body (default = undefined) */
    bodyValue?: BodyType;
}

export class Response {

    /** the web URL of the response */
    public url: string;
    /** the response headers */
    public headers: HeadersType;
    public size: number;
    public type: ResponseType;

    /** the web HTML content */
    public content: string;
    /** the JSON value from the response */
    public json: unknown;
    /** the buffer value of the web content */
    public buffer: Buffer;

    public timeout: number;
    public status: number;

    public ok: boolean;
    public redirected: boolean;

    constructor(
        url: string,
        headers: HeadersType,
        size: number,
        type: ResponseType,

        content: string,
        json: unknown,
        buffer: Buffer,

        timeout: number,
        status: number,

        ok: boolean,
        redirected: boolean
    ) {
        this.url = url;
        this.headers = headers as HeadersType;
        this.size = size;
        this.type = type;

        this.content = content;
        this.json = json;
        this.buffer = buffer;

        this.timeout = timeout;
        this.status = status;

        this.ok = ok;
        this.redirected = redirected;
    }

}

export class HttpClient {

    public headers: HeadersType = {};
    public cookies: Map<string, string> = new Map();

    private useSession: boolean;

    public constructor(useSession?: boolean, headers?: HeadersType) {
        this.useSession = Boolean(useSession);
        this.headers = headers ?? {};
    }

    /** Applies the cookies to the current headers */
    private headersWithCookies(): HeadersType {
        const cookieList: string[] = [];

        for (const [key, value] of this.cookies)
            cookieList.push(key + '=' + value);

        const cookieReady = cookieList.join('; ');
        return { ...this.headers, 'Cookie': cookieReady };
    }

    /** 
     * Grabs the cookies from the response 
     */
    private grabCookies(headers: HeadersType) {
        const setcookies = headers['set-cookie'] as string[] | string;
        if (!setcookies)
            return;

        console.log(setcookies);
        const rawcookies = (Array.isArray(setcookies) ? setcookies.join('; ') : setcookies).split('; ');

        for (const map of rawcookies) {
            const [key, value] = map.split('=');
            this.cookies.set(key, value);
        }
    }

    /** Parses the raw headers from node-fetch */
    private parseHeaders(headers: rawfetch.Headers): HeadersType {
        const result: HeadersType = {};

        // console.log(headers.raw());
        for (const [key, value] of Object.entries(headers.raw()))
            result[key] = value;

        return result;
    }

    /** Parses the json from response */
    private async getJson(resp: rawfetch.Body): Promise<unknown> {
        try {
            return await resp.json();
        } catch (_) {
            return {};
        }
    }

    /** Parses the body for post request */
    private parseBody(body: BodyType): rawfetch.BodyInit | undefined {
        if (!body)
            return;

        const { form, json, query } = body;
        if (query) {
            const params = new URLSearchParams();
            for (const key in query)
                params.append(key, query[key]);

            return params;
        } else if (json) {
            return JSON.stringify(json);
        } else if (form) {
            const newform = new FormData();

            for (const key in form)
                newform.append(key, form[key]);

            return newform;
        }
    }

    /** Handles creating a new response */
    private async createResponse(resp: rawfetch.Response): Promise<Response> {
        return new Response(
            resp.url,
            this.parseHeaders(resp.headers),
            resp.size,
            resp.type,

            await resp.clone().text(),
            await this.getJson(resp.clone()),
            await resp.clone().buffer(),

            resp.timeout,
            resp.status,

            resp.ok,
            resp.redirected
        );
    }

    /**
     * Handles GET request to a website
     */
    public async get(url: string, options?: Options): Promise<Response> {
        const resp = await fetch(url, {
            headers: this.useSession ? this.headersWithCookies() : this.headers,
            method: 'GET',
            body: options?.bodyValue ? this.parseBody(options.bodyValue) : undefined,
            ...options
        });

        const result = await this.createResponse(resp);
        if (this.useSession)
            this.grabCookies(result.headers);

        return result;
    }

    /**
     * Handles POST request to a website
     * 
     * @param body the body
     */
    public async post(url: string, options?: Options): Promise<Response> {
        const bodyRes = options?.bodyValue ? this.parseBody(options.bodyValue) : undefined;

        console.log(bodyRes);
        console.log(this.headersWithCookies());

        const resp = await fetch(url, {
            headers: this.useSession ? this.headersWithCookies() : this.headers,
            method: 'POST',
            body: options?.bodyValue ? this.parseBody(options.bodyValue) : undefined,
            ...options,
        });


        const result = await this.createResponse(resp);
        if (this.useSession)
            this.grabCookies(result.headers);

        return result;
    }

    public clear(): void {
        this.cookies.clear();
        this.headers = {};
    }

}