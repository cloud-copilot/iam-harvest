import { join, resolve } from 'path'

export const awsIamDocsRoot = 'https://docs.aws.amazon.com/service-authorization/latest/reference/'

export const filesLocation = resolve('./files')

export const operatorsLocation = join(filesLocation, 'operators')

export const operatorDetailsLocation = join(operatorsLocation, 'details')

export const htmlDownloadLocation = join(filesLocation, 'html')

export const jsonDocsLocaiton = join(filesLocation, 'json')

export const serviceInfoLocation = join(filesLocation, 'serviceInfo')
export const actionsLocation = join(serviceInfoLocation, 'actions')
export const resourceTypesLocation = join(serviceInfoLocation, 'resourceTypes')
export const conditionKeysLocation = join(serviceInfoLocation, 'conditionKeys')