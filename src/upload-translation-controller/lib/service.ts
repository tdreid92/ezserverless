import { config } from './config';
import { Invoker } from '../../../layers/common/nodejs/models/invoker/invoker';
import { Query } from '../../../layers/common/nodejs/models/database-request';
import { PayloadRequest, PayloadResponse } from '../../../layers/common/nodejs/models/invoker/payload';
import { UploadTranslationRequest } from '../../../layers/common/nodejs/models/upload-translation-request';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Handler } from 'aws-lambda';
import { BulkUploadTranslationRequest } from '../../../layers/common/nodejs/models/bulk-upload-translation-request';
import { Language, PollyUploadRequest } from '../../../layers/common/nodejs/models/polly-upload-request';
import { GatewayEvent } from '../../../layers/common/nodejs/middleware/event-logger';

const handlePost: Handler = async (
  event: GatewayEvent<BulkUploadTranslationRequest>
): Promise<APIGatewayProxyResultV2> => {
  const uploadReq: BulkUploadTranslationRequest = event.body;
  const bulkUploadResponse: PayloadResponse = await uploadDefinition(uploadReq.translations);
  if (bulkUploadResponse.statusCode == 200) {
    return {
      statusCode: bulkUploadResponse.statusCode,
      body: JSON.stringify(bulkUploadResponse.body)
    };
  }
  return bulkUploadResponse;
};

const uploadDefinition = async (uploadRequests: UploadTranslationRequest[]): Promise<PayloadResponse> => {
  const payloadRequest: PayloadRequest = {
    payload: {
      query: Query.BatchWrite,
      uploadRequests: uploadRequests
    }
  };

  const databaseInvocation = await new Invoker({
    functionName: config.repositoryServiceFunction,
    functionEndpoint: config.functionEndpoint
  })
    .setPayloadRequest(payloadRequest)
    .invoke();
  //try catch?
  const pollyUploadRequests: PollyUploadRequest[] = uploadRequests.map((req: UploadTranslationRequest) => ({
    language: (req.source as unknown) as Language,
    word: req.word,
    speed: 'Medium'
  }));
  // const pollyInvocation = await new Invoker({
  //   functionName: config.speechSynthesizerFunction,
  //   functionEndpoint: config.functionEndpoint
  // })
  //   .setPayloadRequest(pollyUploadRequests)
  //   .invoke();
  return <PayloadResponse>databaseInvocation.payloadResponse;
};

export const service = {
  handle: handlePost
};
