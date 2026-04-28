package com.reglens.workflow_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reglens.workflow_service.domain.WorkflowEvent;
import com.reglens.workflow_service.repository.WorkflowEventRepository;

class WorkflowEventRecorderTest {

	private WorkflowEventRepository repository;
	private WorkflowEventRecorder recorder;

	@BeforeEach
	void setUp() {
		repository = mock(WorkflowEventRepository.class);
		recorder = new WorkflowEventRecorder(new ObjectMapper(), repository);
	}

	@Test
	void mapsMappingSuggestedPayload() {
		String eventId = UUID.randomUUID().toString();
		String obligationId = UUID.randomUUID().toString();
		String json = """
				{"eventId":"%s","obligationId":"%s","suggestedBy":"analyst@reglens","occurredAt":"2026-03-01T08:30:00Z"}
				""".formatted(eventId, obligationId).trim();

		recorder.record("mapping.suggested", json);

		ArgumentCaptor<WorkflowEvent> cap = ArgumentCaptor.forClass(WorkflowEvent.class);
		verify(repository).save(cap.capture());
		WorkflowEvent e = cap.getValue();
		assertThat(e.getId()).isEqualTo(eventId);
		assertThat(e.getType()).isEqualTo(WorkflowEventRecorder.TYPE_MAPPING_SUGGESTED);
		assertThat(e.getObligationId()).isEqualTo(obligationId);
		assertThat(e.getActor()).isEqualTo("analyst@reglens");
	}

	@Test
	void duplicateKeyIsSwallowed() {
		when(repository.save(any())).thenThrow(new DuplicateKeyException("dup"));
		String eventId = UUID.randomUUID().toString();
		String json = """
				{"eventId":"%s","obligationId":"%s","suggestedBy":"x","occurredAt":"2026-03-01T08:30:00Z"}
				""".formatted(eventId, UUID.randomUUID()).trim();
		recorder.record("mapping.suggested", json);
		verify(repository).save(any());
	}

	@Test
	void documentIngestedStoresObligationIds() {
		String eventId = UUID.randomUUID().toString();
		String doc = UUID.randomUUID().toString();
		String o1 = UUID.randomUUID().toString();
		String json = """
				{"eventId":"%s","documentId":"%s","obligationIds":["%s"],"ingestedBy":"ingest","occurredAt":"2026-04-01T00:00:00Z"}
				""".formatted(eventId, doc, o1).trim();

		recorder.record("document.ingested", json);

		ArgumentCaptor<WorkflowEvent> cap = ArgumentCaptor.forClass(WorkflowEvent.class);
		verify(repository).save(cap.capture());
		assertThat(cap.getValue().getObligationIds()).isEqualTo(List.of(o1));
		assertThat(cap.getValue().getDocumentId()).isEqualTo(doc);
	}
}
