/**
 * Represents a resource type found in the Resource types table of a service's page
 */
export interface ResourceType {
  key: string
  arn: string
  conditionKeys?: string[]
}

/**
 * Represents a resource typ reference found in the Actions table of a service's page
 */
export interface ActionResourceType {
  name: string
  required: boolean
  conditionKeys: string[]
  dependentActions: string[]
}

/**
 * Represents a Scenario found in the description of an Action. There are only
 * a few actions in all the documentation that have scenarios at all.
 */
export interface Scenario {
  name: string
  resourceTypes: {
    name: string
    required: boolean
  }[]
}

/**
 *  Represents an Action found in the Actions table of a service's page
 */
export interface Action {
  name: string
  description: string
  accessLevel: string
  // TODO: Make these arrays optional to save a lot of space in the JSON, maybe not? I don't know.
  resourceTypes: ActionResourceType[]
  conditionKeys: string[]
  dependentActions: string[]
  scenarios?: Scenario[]
  isPermissionOnly?: boolean
}

/**
 * A Condition Key found in the Condition keys table of a service's page
 */
export interface ConditionKey {
  key: string
  description: string
  type: string
}

/**
 * Represents all information about a service found on it's page
 */
export interface ServiceDefinition {
  name: string
  prefix: string
  actions: Action[]
  resourceTypes?: ResourceType[]
  conditionKeys?: ConditionKey[]
}
