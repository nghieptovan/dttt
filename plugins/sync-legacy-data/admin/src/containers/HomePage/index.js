import React, { memo, Component } from "react";
import PropTypes from "prop-types";
import pluginId from "../../pluginId";
import UploadFileForm from "../../components/UploadFileForm";
import {
  HeaderNav,
  LoadingIndicator,
  PluginHeader,
  request,
} from "strapi-helper-plugin";
import Row from "../../components/Row";
import Block from "../../components/Block";
import { Select, Label, Button, InputText } from "@buffetjs/core";
import { get, has, isEmpty, pickBy, set } from "lodash";

const getUrl = (to) =>
  to ? `/plugins/${pluginId}/${to}` : `/plugins/${pluginId}`;

class HomePage extends Component {
  importSources = [
    { label: "External URL ", value: "url" },
    { label: "Upload file", value: "upload" },
    { label: "Raw text", value: "raw" },
  ];

  state = {
    loading: true,
    modelOptions: [],
    models: [],
    importSource: "upload",
    analyzing: false,
    analysis: null,
    selectedContentType: "",
    fieldMapping: {},
    url: "",
    currentProcesses: [],
  };

  componentDidMount() {
    this.getModels().then((res) => {
      const { models, modelOptions } = res;

      this.setState({
        models,
        modelOptions,
        selectedContentType: modelOptions ? modelOptions[0].value : "",
      });
    });

    this.getCurrentProcesses();
  }

  render() {
    const { url } = this.state;
    return (
      <div className={"container-fluid"} style={{ padding: "18px 30px" }}>
        <PluginHeader
          title={"Import Content"}
          description={"Import CSV and RSS-Feed into your Content Types"}
        />
        <HeaderNav
          links={[
            {
              name: "Import Data",
              to: getUrl(""),
            },
          ]}
          style={{ marginTop: "4.4rem" }}
        />
        <div className="row">
          <Block
            title="General"
            description="Configure the Import Source & Destination"
            style={{ marginBottom: 12 }}
          >
            <Row className={"row"}>
              <div className={"col-4"}>
                <Label htmlFor="importSource">Import Source</Label>
                <InputText
                  name={"urlInput"}
                  placeholder={"https://www.nasa.gov/rss/dyn/educationnews.rss"}
                  type={"url"}
                  value={url}
                  onChange={({ target: { value } }) => {
                    this.onUrlChange(value);
                  }}
                />
              </div>
              <div className={"col-4"}>
                <Label htmlFor="importDest">Import Destination</Label>
                <Select
                  value={this.state.selectedContentType}
                  name="importDest"
                  options={this.state.modelOptions}
                  onChange={({ target: { value } }) =>
                    this.selectImportDest(value)
                  }
                />
              </div>
              <div className={"col-4"}>
                <Label htmlFor="importButton" />
                <Button
                  name="importButton"
                  style={{ marginTop: 6 }}
                  label={"Run the Import"}
                  onClick={this.onSaveImport}
                />
              </div>
            </Row>
            <Row>
              <Label>Current processes</Label>
              <table style={{width: '100%'}} className="table-bordered">
                <tr>
                  <th className="p-4">Name</th>
                  <th style={{width: '50px'}} className="p-4">Action</th>
                </tr>
                {this.state.currentProcesses.map((item) => {
                  return (
                    <tr>
                      <td className="p-4">{item}</td>
                      <td className="p-4"><button onClick={()=>{this.stopProcess(item)}} className="btn btn-danger p-2">Stop</button></td>
                    </tr>
                  );
                })}
              </table>
            </Row>
          </Block>
        </div>
      </div>
    );
  }
  selectImportSource = (importSource) => {
    this.setState({ importSource });
  };
  selectImportDest = (selectedContentType) => {
    this.setState({ selectedContentType });
  };
  onRequestAnalysis = async (analysisConfig) => {
    this.analysisConfig = analysisConfig;
    this.setState({ analyzing: true }, async () => {
      try {
        const response = await request("/import-content/preAnalyzeImportFile", {
          method: "POST",
          body: analysisConfig,
        });

        this.setState({ analysis: response, analyzing: false }, () => {
          strapi.notification.success(`Analyzed Successfully`);
        });
      } catch (e) {
        this.setState({ analyzing: false }, () => {
          strapi.notification.error(`Analyze Failed, try again`);
          strapi.notification.error(`${e}`);
        });
      }
    });
  };

  getModels = async () => {
    this.setState({ loading: true });
    try {
      const response = await request("/content-type-builder/content-types", {
        method: "GET",
      });

      // Remove non-user content types from models
      const models = get(response, ["data"], []).filter(
        (obj) => !has(obj, "plugin")
      );

      let modelOptions = models.map((model) => {
        return {
          label: get(model, ["schema", "name"], ""), // (name is used for display_name)
          value: model.uid, // (uid is used for table creations)
        };
      });

      modelOptions.push({
        label: "User",
        value: "plugins::users-permissions.user",
      });
      this.setState({ loading: false });

      return { models, modelOptions };
    } catch (e) {
      this.setState({ loading: false }, () => {
        strapi.notification.error(`${e}`);
      });
    }
    return [];
  };

  getTargetModel = () => {
    const { models } = this.state;
    if (!models) return null;
    return models.find((model) => model.uid === this.state.selectedContentType);
  };

  setFieldMapping = (fieldMapping) => {
    this.setState({ fieldMapping });
  };

  onSaveImport = async () => {
    const { url, selectedContentType, fieldMapping } = this.state;
    const { analysisConfig } = this;
    const importConfig = {
      contentType: selectedContentType,
      url: url,
    };
    try {
      const result = await request("/sync-legacy-data/import-data", {
        method: "POST",
        body: importConfig,
      });
      this.setState({ saving: false, currentProcesses: result.data }, () => {
        strapi.notification.info("Import started");
      });
    } catch (e) {
      console.error(e);

      strapi.notification.error(`${e}`);
    }
  };

  onUrlChange(value) {
    this.setState({
      url: value,
    });
  }
  getCurrentProcesses() {
    request("/sync-legacy-data/get-current-processes", {
      method: "GET",
    }).then(result => {
      console.log("getCurrentProcesses: ===> result: ", result);
      this.setState({
        currentProcesses: result.data
      })
    });
  };

  stopProcess(proc){
    request("/sync-legacy-data/stop-process", {
      method: "POST",
      body:{
        "process": proc
      }
    }).then(result => {
      console.log("stopProcess: ===> result: ", result);
      strapi.notification.info(`Stop process ${proc} successfully`);
      this.setState({
        currentProcesses: result.data
      })
    });
  }
}
export default memo(HomePage);
