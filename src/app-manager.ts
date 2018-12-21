import { PluginProfile, ModuleProfile, API } from './types'
import { Plugin } from './plugin'

interface EventListeners {
  [origin: string]: {
    [type: string]: {
      [key: string]: (value: any) => void
    }
  }
}

export class AppManager {
  private modules: {
    [type: string]: { json: ModuleProfile, api: API }
  } = {}
  private plugins: {
    [type: string]: { json: PluginProfile, api: Plugin }
  } = {}
  events: EventListeners = {}

  constructor(dependencies: {
    modules?: { json: ModuleProfile; api: API }[]
    plugins?: { json: PluginProfile; api: Plugin }[]
    options?: {
      boostrap: string
    }
  }) {
    // Modules
    const modules = dependencies.modules || []
    this.modules = modules.reduce((acc, {json, api}) => {
      this[api.type] = {}
      this.activateApi(json, api) // Activate module automaticaly
      return { ...acc, [json.type]: { json, api } }
    }, {})

    // Plugins
    const plugins = dependencies.plugins || []
    this.plugins = plugins.reduce((acc, {json, api}) => {
      this[api.type] = {}
      return { ...acc, [json.type]: { json, api } }
    }, {})

    // bootstrap
    if (dependencies.options && dependencies.options.boostrap) {
      const {api} = this.modules[dependencies.options.boostrap]
      api['activate'].on((type: string) => this.activate(type))
      api['deactivate'].on((type: string) => this.deactivate(type))
    }
  }


  /** Broadcast a message to every plugin listening */
  private broadcast(type: string, key: string, value: any) {
    for (const origin in this.events) {
      if (this.events[origin][type]) {
        const destination = this.events[origin][type]
        if (destination[key]) destination[key](value)
      }
    }
  }

  /**************************/
  /* ----- ACTIVATION ----- */
  /**************************/

  /** Add an api to the AppModule */
  private activateApi(json: ModuleProfile, api: API) {
    const events = json.events || []
    events.forEach(event => {
      if (event in api) {
        api[event].on((value: any) => {
          this.broadcast(api.type, event, value)
        })
      }
    })

    const methods = json.methods || []
    methods.forEach(key => {
      if (key in api) {
        this[api.type][key] = api[key]
      }
    })
  }

  /** Activate Plugin */
  private activatePlugin(json: PluginProfile, api: Plugin) {
    api.request = ({ type, key, value }) => this[type][key](value)

    const notifications = json.notifications || []
    notifications.forEach(({ type, key }) => {
      const origin = api.type
      if (!this.events[origin]) this.events[origin] = {}
      if (!this.events[origin][type]) this.events[origin][type] = {}
      this.events[origin][type][key] = api.notifs[type][key]
    })
  }

  /** Activate a plugin or module */
  public activate(type: string) {
    if (!this[type]) throw new Error(`Plugin ${type} is not registered yet`)
    // If type is registered as a plugin
    if (this.plugins[type]) {
      const { json, api } = this.plugins[type]
      this.activateApi(json, api)
      this.activatePlugin(json, api)
      api.activate()
    }
    // If type is registered as a module
    if (this.modules[type]) {
      const { json, api } = this.plugins[type]
      this.activateApi(json, api)
      api.activate()
    }
  }


  /****************************/
  /* ----- DEACTIVATION ----- */
  /****************************/

  /** Add an api to the AppModule */
  private deactivateApi(json: ModuleProfile, api: API) {
    this[api.type] = {}

    const events = json.events || []
    events.forEach(event => {
      // TODO : EventManager
      // if (event in api) api[event].unregister()
    })

    const methods = json.methods || []
    methods.forEach(key => {
      if (key in api) delete this[api.type][key]
    })
  }

  /** Deactivate Plugin */
  private deactivatePlugin(json: PluginProfile, api: Plugin) {
    delete api.request

    const notifications = json.notifications || []
    notifications.forEach(({ type, key }) => {
      if (!this.events[api.type]) this.events[api.type] = {}
      if (!this.events[api.type][type]) this.events[api.type][type] = {}
      delete this.events[api.type][type][key]
    })
  }

  /** Deactivate a plugin or module */
  public deactivate(type: string) {
    if (!this[type]) throw new Error(`Plugin ${type} is not registered yet`)
    if (this.plugins[type]) {
      const { json, api } = this.plugins[type]
      this.deactivateApi(json, api)
      this.deactivatePlugin(json, api)
      api.deactivate()
    }
    if (this.modules[type]) {
      const { json, api } = this.plugins[type]
      this.deactivateApi(json, api)
      api.deactivate()
    }

  }

}












/*
export interface InternalModuleConfig<T extends ModuleProfile = any> {
  [type: string]: T
}
export interface ExternalModuleConfig<T extends IframeProfile = any> {
  [type: string]: T
}

export interface AppConfig {
  modules: InternalModuleConfig
  plugins: ExternalModuleConfig
  providers: any
}

export type InternalConfig<C extends AppConfig> = {
  [key in keyof C['modules']]: Profile<C['modules'][key]>
}
export type ExternalConfig<C extends AppConfig> = {
  [key in keyof C['plugins']]: ExternalProfile<C['plugins'][key]>
}
export interface ProfileConfig<C extends AppConfig> {
  modules?: InternalConfig<C>
  plugins?: ExternalConfig<C>
  providers: any
}

export type InternalMethods<C extends AppConfig> = {
  [key in keyof C['modules']]: C['modules'][key]['methods']
}
export type ExternalMethods<C extends AppConfig> = {
  [key in keyof C['plugins']]: C['plugins'][key]['methods']
}
export type ManagerMethods<C extends AppConfig> = InternalMethods<C> & ExternalMethods<C>


export type InternalDefinition<C extends AppConfig> = {
  [key in keyof C['modules']]: Module<C['modules'][key]>
}
export type ExternalDefinition<C extends AppConfig> = {
  [key in keyof C['plugins']]: Plugin<C['plugins'][key]>
}
export type ManagerDefinition<C extends AppConfig> = InternalDefinition<C> & ExternalDefinition<C>
*/