// GraphQL imports and client setup
import { ApolloClient, InMemoryCache, HttpLink, NormalizedCacheObject, from } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import * as cookie from 'cookie';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import generated GraphQL operations
import {
  LoginDocument,
} from './generated/graphql';

// Token storage utilities
export interface TokenData {
  cookies: { [key: string]: string };
  timestamp: number;
}

export interface TokenStorage {
  [email: string]: TokenData;
}

export const getTokenFilePath = (): string => {
  const homeDir = os.homedir();
  return path.join(homeDir, '.saffron-tokens.json');
};

export const loadTokens = (): TokenStorage => {
  try {
    const tokenFilePath = getTokenFilePath();
    if (fs.existsSync(tokenFilePath)) {
      const data = fs.readFileSync(tokenFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
  return {};
};

export const saveTokens = (tokens: TokenStorage): void => {
  try {
    const tokenFilePath = getTokenFilePath();
    fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
};

export const saveTokenForEmail = (email: string, cookies: { [key: string]: string }): void => {
  const tokens = loadTokens();
  tokens[email] = {
    cookies,
    timestamp: Date.now(),
  };
  saveTokens(tokens);
};

export const loadTokenForEmail = (email: string): { [key: string]: string } | null => {
  const tokens = loadTokens();
  const tokenData = tokens[email];

  if (tokenData) {
    // Check if token is less than 30 days old
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - tokenData.timestamp < thirtyDaysInMs) {
      return tokenData.cookies;
    } else {
      // Remove expired token
      delete tokens[email];
      saveTokens(tokens);
    }
  }

  return null;
};

export class SaffronClient {
  public client: ApolloClient<NormalizedCacheObject>;
  private cookies: { [key: string]: string } = {};
  private currentEmail: string | null = null;

  constructor() {
    // Context link to set headers (including dynamic cookie)
    const authLink = setContext((_, { headers }) => {
      // Build cookie header from stored cookies
      const cookieHeader = Object.keys(this.cookies).length > 0
        ? Object.entries(this.cookies)
          .map(([name, value]) => `${name}=${value}`)
          .join('; ')
        : undefined;

      return {
        headers: {
          ...headers,
          'content-type': 'application/json',
          'x-app-version': '1.4.109',
          'x-platform': 'main-web',
          'Origin': 'https://www.mysaffronapp.com',
          'Referer': 'https://www.mysaffronapp.com/',
          ...(cookieHeader && { 'Cookie': cookieHeader }),
        }
      };
    });

    // Custom HTTP link that can access response headers
    const httpLink = new HttpLink({
      uri: 'https://prod.mysaffronapp.com/graphql',
      fetch: async (uri, options) => {
        const response = await fetch(uri, options);

        // Extract and parse cookies from response headers
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          console.error('Received set-cookie:', setCookieHeader);

          // Parse the set-cookie header using the cookie library
          try {
            // Extract just the name=value part (before the first semicolon)
            const cookiePart = setCookieHeader.split(';')[0];
            if (cookiePart) {
              const parsed = cookie.parse(cookiePart);
              let cookiesUpdated = false;
              Object.entries(parsed).forEach(([name, value]) => {
                if (value) {
                  this.cookies[name] = value;
                  console.error(`Stored cookie: ${name}=${value}`);
                  cookiesUpdated = true;
                }
              });

              // Always save updated cookies to file if we have a current email
              if (cookiesUpdated && this.currentEmail) {
                saveTokenForEmail(this.currentEmail, this.cookies);
                console.error(`Updated saved tokens for ${this.currentEmail}`);
              }
            }
          } catch (error) {
            console.error('Error parsing cookie:', error);
          }
        }

        return response;
      }
    });

    this.client = new ApolloClient({
      link: from([authLink, httpLink]),
      cache: new InMemoryCache(),
    });
  }

  loadTokensForEmail(email: string): boolean {
    const savedTokens = loadTokenForEmail(email);
    if (savedTokens) {
      this.cookies = savedTokens;
      this.currentEmail = email;
      console.error(`Loaded saved tokens for ${email}`);
      return true;
    }
    return false;
  }

  async login(email: string, password: string) {
    this.currentEmail = email;

    const result = await this.client.mutate({
      mutation: LoginDocument,
      variables: { input: { email, password } },
    });

    // Note: Tokens are now automatically saved in the fetch function when set-cookie headers are received

    console.error('Login result:', JSON.stringify(result, null, 2));
    console.error('Cookies after login:', this.cookies);

    return result;
  }

  getCookies(): { [key: string]: string } {
    return this.cookies;
  }

  getCookie(name: string): string | undefined {
    return this.cookies[name];
  }
}
