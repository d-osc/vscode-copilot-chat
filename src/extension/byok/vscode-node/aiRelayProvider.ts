/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { IExperimentationService } from '../../../platform/telemetry/common/nullExperimentationService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { BYOKAuthType, BYOKKnownModels } from '../common/byokProvider';
import { BaseOpenAICompatibleLMProvider } from './baseOpenAICompatibleProvider';
import { IBYOKStorageService } from './byokStorageService';

export class AIRelayAIBYOKLMProvider extends BaseOpenAICompatibleLMProvider {
	public static readonly providerName = 'AIRelay';

	constructor(
		knownModels: BYOKKnownModels,
		byokStorageService: IBYOKStorageService,
		@IFetcherService _fetcherService: IFetcherService,
		@ILogService _logService: ILogService,
		@IInstantiationService _instantiationService: IInstantiationService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IExperimentationService private readonly _expService: IExperimentationService
	) {
		super(
			BYOKAuthType.GlobalApiKey,
			AIRelayAIBYOKLMProvider.providerName,
			'http://localhost:8647/copilot/v1',
			knownModels,
			byokStorageService,
			_fetcherService,
			_logService,
			_instantiationService,
		);
	}

	protected override async getAllModels(): Promise<BYOKKnownModels> {
		try {
			const response = await this._fetcherService.fetch('http://localhost:8647/copilot/v1/models', { method: 'GET' });
			const data: any = await response.json();
			const knownModels: BYOKKnownModels = {};
			for (const model of data.data) {
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
}
