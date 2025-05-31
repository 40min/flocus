# PRD: Embed TimeWindows within DayTemplates (v3 - Simplified Embedding)

**1. Project Goal (Updated):**
Refactor `DayTemplate` and `TimeWindow` data storage to embed `TimeWindow`s within `DayTemplate` documents. The entire list of `TimeWindow`s will be managed as part of `DayTemplate` CRUD operations. This change applies to new data; existing data will not be migrated.

**2. Key Changes & Rationale (Updated & Emphasized Cleanup):**

*   **Embedded `TimeWindow`s (No IDs):** `TimeWindow`s will be embedded within `DayTemplate`s without individual `ObjectId`s. The entire list of `TimeWindow`s will be replaced during `DayTemplate` update operations.
*   **Complete Removal of Standalone `TimeWindow` Collection and Artifacts:** The dedicated `time_windows` MongoDB collection will be removed for new installations/data. All associated code artifacts including DB models, service layers, mappers, API schemas (specific to standalone `TimeWindow`s), API endpoints, and related tests for the standalone `TimeWindow` functionality will be deleted.
*   **Simplified `TimeWindow` Management:** All `TimeWindow` data will be managed directly through `DayTemplate` CRUD operations.
*   **Simplified Data Retrieval:** Fetching a `DayTemplate` will inherently include all its `TimeWindow`s.
*   **Codebase Simplification:** Achieved by embedding `TimeWindow`s and removing all standalone `TimeWindow` components.

**3. Detailed Plan Steps (Revised & Cleanup Explicitly Detailed):**

1.  **Define `EmbeddedTimeWindowSchema` (for DB Model & internal use):**
    *   Pydantic model fields:
        *   `name: str`
        *   `start_time: int` (minutes since midnight)
        *   `end_time: int` (minutes since midnight)
        *   `category_id: ObjectId`

2.  **Modify `DayTemplate` DB Model (`backend/app/db/models/day_template.py`):**
    *   Change `time_windows` field to `time_windows: List[EmbeddedTimeWindowSchema] = Field(default_factory=list)`.

3.  **Update API Schemas:**
    *   **`DayTemplate` Schemas (`backend/app/api/schemas/day_template.py`):**
        *   `DayTemplateCreateRequest.time_windows`: Accept `List[TimeWindowInputSchema]`.
        *   `DayTemplateUpdateRequest.time_windows` (or equivalent): Accept `List[TimeWindowInputSchema]` to replace the entire existing list.
        *   `DayTemplateResponse.time_windows`: Output `List[TimeWindowResponse]`.
    *   **`TimeWindow` Schemas (`backend/app/api/schemas/time_window.py`):**
        *   Define `TimeWindowInputSchema` (for providing `TimeWindow` data during `DayTemplate` creation/update - fields: `name`, `start_time`, `end_time`, `category_id`).
        *   Adapt `TimeWindowResponse` (for output within `DayTemplateResponse` - fields: `name`, `start_time`, `end_time`, resolved `category: CategoryResponse`).
        *   *Remove all other schemas previously related to standalone `TimeWindow` CRUD (e.g., old `TimeWindowCreateRequest`, `TimeWindowUpdateRequestSchema` for individual updates, `TimeWindowDB` if it existed as a separate schema).*

4.  **Refactor `DayTemplateService` (`backend/app/services/day_template_service.py`):**
    *   Implement standard CRUD for `DayTemplate`s, handling the `time_windows` list replacement during updates.
    *   Ensure `Category` resolution for `TimeWindowResponse` within `DayTemplateResponse`.

5.  **Update `DayTemplateMapper` (`backend/app/mappers/day_template_mapper.py`):**
    *   Adapt for new `DayTemplate` structure and `Category` resolution for embedded `TimeWindow`s.

6.  **Remove Standalone `TimeWindow` Components:**
    *   **DB Model:** Delete file `backend/app/db/models/time_window.py`.
    *   **Service:** Delete file `backend/app/services/time_window_service.py`.
    *   **Mapper:** Delete file `backend/app/mappers/time_window_mapper.py`.
    *   **API Endpoints:** Delete file `backend/app/api/endpoints/time_windows.py`.

7.  **Update/Remove Tests:**
    *   **`DayTemplate` Tests:** Rewrite/create tests for `DayTemplate` CRUD operations, ensuring they correctly handle the embedded `TimeWindow`s list (e.g., in `backend/tests/api/endpoints/test_day_templates.py`, `backend/tests/mappers/test_day_template_mapper.py`).
    *   **Remove Standalone `TimeWindow` Tests:**
        *   Delete test file for standalone `TimeWindow` API endpoints (e.g., `backend/tests/api/endpoints/test_time_windows.py`).
        *   Delete test file for standalone `TimeWindow` mapper (e.g., `backend/tests/mappers/test_time_window_mapper.py`).
        *   Delete any tests for the old `TimeWindowService`.
        *   Review and remove/update any tests in `backend/tests/api/schemas/test_time_window.py` to only reflect the new `TimeWindowInputSchema` and `TimeWindowResponse` used for embedding.

**4. Updated Mermaid Diagram:**

```mermaid
graph TD
    subgraph Current Data Structure
        DayTemplateDB_Old["DayTemplate (DB Model v1)\n- time_windows: List[ObjectId]"]
        TimeWindowDB_Old["TimeWindow (DB Model v1)\n- _id: ObjectId (TW specific)\n- name: str\n- start_time: int\n- end_time: int\n- category: ObjectId\n- user: ObjectId\n- day_template_id: ObjectId"]
        DayTemplateDB_Old -- Refers to --> TimeWindowDB_Old
    end

    subgraph Proposed Data Structure (New Installations)
        DayTemplateDB_New["DayTemplate (DB Model v2)\n- _id: ObjectId (DT specific)\n- name: str\n- description: Optional[str]\n- user: ObjectId\n- time_windows: List[EmbeddedTimeWindow]"]
        EmbeddedTimeWindow["EmbeddedTimeWindow (Schema)\n- name: str\n- start_time: int\n- end_time: int\n- category_id: ObjectId"]
        DayTemplateDB_New -- Contains list of --> EmbeddedTimeWindow
    end

    Current Data Structure --> Proposed Data Structure

    subgraph Current Services & API
        DTService_Old["DayTemplateService v1"]
        TWService_Old["TimeWindowService v1 (Standalone)"]
        DTEndpoints_Old["Endpoints: /day_templates/*"]
        TWEndpoints_Old["Endpoints: /time_windows/*"]

        DTService_Old --> DayTemplateDB_Old
        DTService_Old -- Reads/Uses --> TWService_Old
        TWService_Old --> TimeWindowDB_Old
        DTEndpoints_Old --> DTService_Old
        TWEndpoints_Old --> TWService_Old
    end

    subgraph Proposed Services & API
        DTService_New["DayTemplateService v2 (Manages Embedded TWs via DayTemplate CRUD)"]
        DTEndpoints_New["Endpoints: /day_templates/* (Handles full TW list)"]

        DTService_New --> DayTemplateDB_New
        DTEndpoints_New --> DTService_New
        Note_TWService["Note: TimeWindowService v1 removed"]
        Note_TWEndpoints["Note: /time_windows/* endpoints removed"]
        Note_TWSubEndpoints["Note: /day_templates/{dt_id}/time_windows/* sub-resource endpoints removed"]
    end
    Current Services & API --> Proposed Services & API
