import { Application } from 'express';

interface RouteInfo {
  method: string;
  path: string;
  url: string;
}

export function getRegisteredRoutes(app: Application, host: string, port: number): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const baseUrl = `http://${host}:${port}`;

  // Helper function to extract routes from router layers
  function extractRoutes(layer: any, basePath = ''): void {
    if (layer.route) {
      // This is a route layer
      const route = layer.route;
      const path = basePath + route.path;
      
      Object.keys(route.methods).forEach(method => {
        if (route.methods[method]) {
          routes.push({
            method: method.toUpperCase(),
            path: path,
            url: `${baseUrl}${path}`
          });
        }
      });
    } else if (layer.name === 'router' && layer.handle?.stack) {
      // This is a router layer, recursively extract routes
      const routerBasePath = layer.regexp.source
        .replace('\\/?', '')
        .replace('(?=\\/|$)', '')
        .replace(/\\\//g, '/')
        .replace(/^\^/, '')
        .replace(/\$.*/, '');
      
      // Clean up the regex pattern to get actual path
      let cleanPath = routerBasePath;
      if (cleanPath.includes('|')) {
        cleanPath = cleanPath.split('|')[0];
      }
      if (cleanPath.startsWith('(?:')) {
        cleanPath = cleanPath.replace('(?:', '').replace(')', '');
      }
      
      const newBasePath = basePath + cleanPath;
      
      layer.handle.stack.forEach((subLayer: any) => {
        extractRoutes(subLayer, newBasePath);
      });
    }
  }

  // Extract routes from all layers in the app
  if (app._router && app._router.stack) {
    app._router.stack.forEach((layer: any) => {
      extractRoutes(layer);
    });
  }

  // Sort routes by path for better readability
  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

export function formatRoutesForLogging(routes: RouteInfo[]): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  routes.forEach(route => {
    // Create a readable key for the route
    const keyName = route.path
      .replace(/^\//, '') // Remove leading slash
      .replace(/\//g, '_') // Replace slashes with underscores
      .replace(/-/g, '_') // Replace hyphens with underscores
      .replace(/:/g, '') // Remove parameter indicators
      || 'root';
    
    const methodPath = `${route.method} ${route.path}`;
    
    // If we already have this key, append method to make it unique
    let finalKey = keyName;
    let counter = 1;
    while (formatted[finalKey]) {
      finalKey = `${keyName}_${counter}`;
      counter++;
    }
    
    formatted[finalKey] = route.url;
  });
  
  return formatted;
}