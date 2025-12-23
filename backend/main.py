from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

app = FastAPI(title="OrangeFlow Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PreprocessPayload(BaseModel):
    target: str
    features: list[str]
    scaling: str = "standard"  # standard | minmax | none
    handle_missing: str = "drop"  # drop | mean | median


class SplitPayload(BaseModel):
    test_size: float = 0.2
    random_state: int = 42
    stratify: bool = True


class TrainPayload(BaseModel):
    model_type: str  # logistic | tree
    params: dict | None = None
    model_config = {"protected_namespaces": ()}


STATE = {
    "df": None,
    "X": None,
    "y": None,
    "features": None,
    "target": None,
    "feature_names": None,
    "model": None,
    "X_train": None,
    "X_test": None,
    "y_train": None,
    "y_test": None,
}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        filename = file.filename or ""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".csv", ".xlsx", ".xls"]:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        content = await file.read()
        from io import BytesIO
        bio = BytesIO(content)
        if ext == ".csv":
            try:
                df = pd.read_csv(bio)
            except Exception:
                bio.seek(0)
                df = pd.read_csv(bio, sep=None, engine="python")
        else:
            try:
                df = pd.read_excel(bio)
            except Exception:
                bio.seek(0)
                df = pd.read_excel(bio, sheet_name=0, engine="openpyxl")
        if df.empty:
            raise HTTPException(status_code=400, detail="Dataset is empty")
        STATE["df"] = df
        STATE["X"] = None
        STATE["y"] = None
        STATE["features"] = None
        STATE["target"] = None
        STATE["X_train"] = None
        STATE["X_test"] = None
        STATE["y_train"] = None
        STATE["y_test"] = None

        cols = list(df.columns)
        head = df.head(20)
        preview = head.replace({np.nan: None}).to_dict(orient="records")
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        suggested = None
        cand = [c for c in cols if str(c).lower() in ["target", "label", "class", "y", "outcome"]]
        if cand:
            suggested = cand[0]
        else:
            suggested = cols[-1] if cols else None
        return {
            "rows": int(df.shape[0]),
            "columns": cols,
            "preview": preview,
            "numeric_columns": numeric_cols,
            "suggested_target": suggested,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/preprocess")
def preprocess(payload: PreprocessPayload):
    try:
        df = STATE["df"]
        if df is None:
            raise HTTPException(status_code=400, detail="Upload a dataset first")
        target = payload.target
        features = payload.features or []
        if target not in df.columns:
            raise HTTPException(status_code=400, detail="Invalid target column")

        work_df = df.copy()
        if payload.handle_missing == "drop":
            work_df = work_df.dropna()
        else:
            num_cols = work_df.select_dtypes(include=[np.number]).columns
            cat_cols = work_df.select_dtypes(exclude=[np.number]).columns
            if payload.handle_missing == "mean":
                work_df[num_cols] = work_df[num_cols].fillna(work_df[num_cols].mean())
            elif payload.handle_missing == "median":
                work_df[num_cols] = work_df[num_cols].fillna(work_df[num_cols].median())
            mode_vals = work_df[cat_cols].mode().iloc[0] if len(cat_cols) else None
            if mode_vals is not None and len(cat_cols):
                work_df[cat_cols] = work_df[cat_cols].fillna(mode_vals)

        if payload.target in features:
            features = [f for f in features if f != payload.target]
        X_df = work_df[features]
        y = work_df[target]

        uniq = pd.Series(y).nunique(dropna=True)
        if uniq < 2:
            raise HTTPException(status_code=400, detail="Target must have at least two classes")

        sel_num_cols = X_df.select_dtypes(include=[np.number]).columns.tolist()
        sel_cat_cols = [c for c in X_df.columns if c not in sel_num_cols]

        X_num = X_df[sel_num_cols] if len(sel_num_cols) else pd.DataFrame(index=X_df.index)
        X_cat = X_df[sel_cat_cols] if len(sel_cat_cols) else pd.DataFrame(index=X_df.index)

        if len(sel_cat_cols):
            X_cat = X_cat.astype(str)
            X_cat = pd.get_dummies(X_cat, drop_first=False)
        if len(sel_num_cols):
            if payload.scaling == "standard":
                scaler = StandardScaler()
                X_num_values = scaler.fit_transform(X_num.values)
                X_num = pd.DataFrame(X_num_values, index=X_df.index, columns=sel_num_cols)
            elif payload.scaling == "minmax":
                scaler = MinMaxScaler()
                X_num_values = scaler.fit_transform(X_num.values)
                X_num = pd.DataFrame(X_num_values, index=X_df.index, columns=sel_num_cols)
        X_final = pd.concat([X_num, X_cat], axis=1)
        X = X_final.values

        STATE["X"] = X
        STATE["y"] = y.values
        STATE["features"] = features
        STATE["target"] = target
        STATE["feature_names"] = list(X_final.columns)
        STATE["X_train"] = None
        STATE["X_test"] = None
        STATE["y_train"] = None
        STATE["y_test"] = None

        return {"samples": int(X.shape[0]), "dims": int(X.shape[1])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/split")
def split(payload: SplitPayload):
    try:
        X = STATE["X"]
        y = STATE["y"]
        if X is None or y is None:
            raise HTTPException(status_code=400, detail="Preprocess data first")
        strat = None
        if payload.stratify:
            unique, counts = np.unique(y, return_counts=True)
            if len(unique) >= 2 and counts.min() >= 2:
                strat = y
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=payload.test_size, random_state=payload.random_state, stratify=strat
        )
        STATE["X_train"] = X_train
        STATE["X_test"] = X_test
        STATE["y_train"] = y_train
        STATE["y_test"] = y_test
        return {"train": int(len(y_train)), "test": int(len(y_test))}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train")
def train(payload: TrainPayload):
    try:
        X_train = STATE["X_train"]
        y_train = STATE["y_train"]
        X_test = STATE["X_test"]
        y_test = STATE["y_test"]
        if X_train is None or y_train is None:
            raise HTTPException(status_code=400, detail="Split data first")

        if payload.model_type not in ["logistic", "tree"]:
            raise HTTPException(status_code=400, detail="Invalid model_type")
        params = payload.params or {}
        if payload.model_type == "logistic":
            C = float(params.get("C", 1.0))
            clf = LogisticRegression(max_iter=1000, C=C)
        else:
            max_depth = int(params.get("max_depth", 5))
            clf = DecisionTreeClassifier(random_state=42, max_depth=max_depth)

        clf.fit(X_train, y_train)
        STATE["model"] = clf
        y_pred = clf.predict(X_test)
        acc = accuracy_score(y_test, y_pred) * 100.0
        cm = confusion_matrix(y_test, y_pred)
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
        out = {
            "accuracy": round(float(acc), 2),
            "confusion_matrix": cm.astype(int).tolist(),
            "report": report,
            "predictions": y_pred.tolist(),
        }
        if payload.model_type == "tree":
            try:
                import matplotlib.pyplot as plt
                from io import BytesIO

                fig, ax = plt.subplots(figsize=(14, 8))
                class_names = [str(c) for c in np.unique(y_train)]
                feature_names = STATE.get("feature_names") or [f"f{i}" for i in range(X_train.shape[1])]
                plot_tree(
                    clf,
                    feature_names=feature_names,
                    class_names=class_names,
                    filled=True,
                    rounded=True,
                    ax=ax,
                )
                buf = BytesIO()
                fig.savefig(buf, format="svg")
                plt.close(fig)
                out["tree_svg"] = buf.getvalue().decode("utf-8")
            except Exception:
                out["tree_svg"] = None
        return out
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

