/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { IChatModelInformation } from '../../../platform/endpoint/common/endpointProvider';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
// import { IExperimentationService } from '../../../platform/telemetry/common/nullExperimentationService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { BYOKAuthType, BYOKKnownModels, BYOKModelCapabilities } from '../common/byokProvider';
import { BaseOpenAICompatibleLMProvider } from './baseOpenAICompatibleProvider';
import { IBYOKStorageService } from './byokStorageService';

interface AIRelayModelInfoAPIResponse {
	id: string;
	name: string;
	toolCalling: boolean;
	vision: boolean;
	maxInputTokens: number;
	maxOutputTokens: number;
}

export class AIRelayAIBYOKLMProvider extends BaseOpenAICompatibleLMProvider {
	public static readonly providerName = 'AIRelay';
	private _modelCache = new Map<string, IChatModelInformation>();
	//
	constructor(
		private readonly _airelayBaseUrl: string,
		byokStorageService: IBYOKStorageService,
		@IFetcherService _fetcherService: IFetcherService,
		@ILogService _logService: ILogService,
		@IInstantiationService _instantiationService: IInstantiationService,
		// @IConfigurationService private readonly _configurationService: IConfigurationService,
		// @IExperimentationService private readonly _expService: IExperimentationService
	) {
		super(
			BYOKAuthType.None,
			AIRelayAIBYOKLMProvider.providerName,
			`${_airelayBaseUrl}/copilot/v1`,
			undefined,
			byokStorageService,
			_fetcherService,
			_logService,
			_instantiationService,
		);
	}

	protected override async getAllModels(): Promise<BYOKKnownModels> {
		try {
			const response = await this._fetcherService.fetch(`${this._airelayBaseUrl}/models`, { method: 'GET' });
			const data: any = await response.json();
			const knownModels: BYOKKnownModels = {};
			for (const model of data.data) {
				const modelInfo = await this.getModelInfo(model.model, '', undefined);
				this._modelCache.set(model.model, modelInfo);
				knownModels[model.id] = {
					name: model.name,
					toolCalling: model.toolCalling,
					vision: model.vision,
					maxInputTokens: model.maxInputTokens,
					maxOutputTokens: model.maxOutputTokens
				};
			}
			this._knownModels = knownModels;
			return knownModels;
		} catch (error) {
			this._logService.error(error, `Error fetching available OpenRouter models`);
			throw error;
		}

	}

	private async _getAIRelayModelInformation(modelId: string): Promise<AIRelayModelInfoAPIResponse> {
		const response = await this._fetcherService.fetch(`${this._airelayBaseUrl}/copilot/v1/models/${modelId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		return response.json() as unknown as AIRelayModelInfoAPIResponse;
	}

	override async getModelInfo(modelId: string, apiKey: string, modelCapabilities?: BYOKModelCapabilities): Promise<IChatModelInformation> {
		if (this._modelCache.has(modelId)) {
			return this._modelCache.get(modelId)!;
		}
		if (!modelCapabilities) {
			const modelInfo = await this._getAIRelayModelInformation(modelId);
			modelCapabilities = {
				name: modelInfo.name,
				maxOutputTokens: modelInfo.maxOutputTokens,
				maxInputTokens: modelInfo.maxInputTokens,
				vision: modelInfo.vision,
				toolCalling: modelInfo.toolCalling
			};
		}
		return super.getModelInfo(modelId, apiKey, modelCapabilities);
	}
}
