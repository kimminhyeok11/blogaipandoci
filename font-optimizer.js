/**
 * 폰트 최적화 시스템
 * 폰트 서브셋, preload, 그리고 동적 로딩을 통한 성능 최적화
 */

class FontOptimizer {
    constructor() {
        this.FONT_CONFIGS = {
            'Noto Sans KR': {
                weights: [300, 400, 500, 700],
                subsets: ['korean', 'latin'],
                display: 'swap',
                preload: true,
                fallback: 'sans-serif'
            },
            'Inter': {
                weights: [400, 500, 600],
                subsets: ['latin'],
                display: 'swap',
                preload: false,
                fallback: 'sans-serif'
            }
        };

        this.KOREAN_SUBSET_CHARS = [
            // 기본 한글 자모
            'ㄱ-ㅎㅏ-ㅣ가-힣',
            // 자주 사용되는 한글 (1000자)
            '가각간갇갈갉갊감갑값갓갔강갖갗같갚갛개객갠갤갬갭갯갰갱갸갹갼걀걋걍걔걘걜거걱건걷걸걺검겁것겄겅겆겉겊겋게겐겔겜겝겟겠겡겨격겪견겯결겸겹겻겼경곁계곈곌곕곗고곡곤곧골곪곬곯곰곱곳공곶과곽관괄괆괌괍괏광괘괜괠괩괬괭괴괵괸괼굄굅굇굉교굔굘굡굣구국군굳굴굵굶굻굼굽굿궁궂궈궉권궐궜궝궤궷귀귁귄귈귐귑귓규균귤그극근귿글긁금급긋긍긔기긱긴긷길긺김깁깃깅깆깊까깍깎깐깔깖깜깝깟깠깡깥깨깩깬깰깸깹깻깼깽꺄꺅꺌꺼꺽꺾껀껄껌껍껏껐껑께껙껜껨껫껭껴껸껼꼇꼈꼍꼐꼬꼭꼰꼲꼴꼼꼽꼿꽁꽂꽃꽈꽉꽐꽜꽝꽤꽥꽹꾀꾄꾈꾐꾑꾕꾜꾸꾹꾼꿀꿇꿈꿉꿋꿍꿎꿔꿜꿨꿩꿰꿱꿴꿸뀀뀁뀄뀌뀐뀔뀜뀝뀨끄끅끈끊끌끎끓끔끕끗끙끝끼끽낀낄낌낍낏낑나낙낚난낟날낡낢남납낫났낭낮낯낱낳내낵낸낼냄냅냇냈냉냐냑냔냘냠냥너넉넋넌널넒넓넘넙넛넜넝넣네넥넨넬넴넵넷넸넹녀녁년녈념녑녔녕녘녜녠노녹논놀놂놈놉놋농높놓놔놘놜놨뇌뇐뇔뇜뇝뇟뇨뇩뇬뇰뇹뇻뇽누눅눈눋눌눔눕눗눙눠눴눼뉘뉜뉠뉨뉩뉴뉵뉼늄늅늉느늑는늘늙늚늠늡늣능늦늪늬늰늴니닉닌닐닒님닙닛닝닢다닥닦단닫달닭닮닯닳담답닷닸당닺닻닿대댁댄댈댐댑댓댔댕댜더덕덖던덛덜덞덟덤덥덧덩덫덮데덱덴델뎀뎁뎃뎄뎅뎌뎐뎔뎠뎡뎨뎬도독돈돋돌돎돐돔돕돗동돛돝돠돤돨돼됐되된될됨됩됫됴두둑둔둘둠둡둣둥둬뒀뒈뒝뒤뒨뒬뒵뒷뒹듀듄듈듐듕드득든듣들듦듬듭듯등듸디딕딘딛딜딤딥딧딨딩딪따딱딴딸땀땁땃땄땅땋때땍땐땔땜땝땟땠땡떠떡떤떨떪떫떰떱떳떴떵떻떼떽뗀뗄뗌뗍뗏뗐뗑뗘뗬또똑똔똘똥똬똴뙈뙤뙨뚜뚝뚠뚤뚫뚬뚱뛔뛰뛴뛸뜀뜁뜅뜨뜩뜬뜯뜰뜸뜹뜻띄띈띌띔띕띠띤띨띰띱띳띵라락란랄람랍랏랐랑랒랖랗래랙랜랠램랩랫랬랭랴략랸럇량러럭런럴럼럽럿렀렁렇레렉렌렐렘렙렛렝려력련렬렴렵렷렸령례롄롑롓로록론롤롬롭롯롱롸롼뢍뢨뢰뢴뢸룀룁룃룅료룐룔룝룟룡루룩룬룰룸룹룻룽뤄뤘뤠뤼뤽륀륄륌륏륑류륙륜률륨륩륫륭르륵른를름릅릇릉릊릍릎리릭린릴림립릿링마막만많맏말맑맒맘맙맛망맞맡맣매맥맨맬맴맵맷맸맹맺먀먁먈먕머먹먼멀멂멈멉멋멍멎멓메멕멘멜멤멥멧멨멩며멱면멸몃몄명몇몌모목몫몬몰몲몸몹못몽뫄뫈뫘뫙뫼묀묄묍묏묑묘묜묠묩묫무묵묶문묻물묽묾뭄뭅뭇뭉뭍뭏뭐뭔뭘뭡뭣뭬뮈뮌뮐뮤뮨뮬뮴뮷므믄믈믐믓미믹민믿밀밂밈밉밋밌밍및밑바박밖밗반받발밝밞밟밤밥밧방밭배백밴밸뱀뱁뱃뱄뱅뱉뱌뱍뱐뱝버벅번벋벌벎범법벗벙벚베벡벤벧벨벰벱벳벴벵벼벽변별볍볏볐병볕볘볜보복볶본볼봄봅봇봉봐봔봤봬뵀뵈뵉뵌뵐뵘뵙뵤뵨부북분붇불붉붊붐붑붓붕붙붚붜붤붰붸뷔뷕뷘뷜뷩뷰뷴뷸븀븃븅브븍븐블븜븝븟비빅빈빌빎빔빕빗빙빚빛빠빡빤빨빪빰빱빳빴빵빻빼빽뺀뺄뺌뺍뺏뺐뺑뺘뺙뺨뻐뻑뻔뻗뻘뻠뻣뻤뻥뻬뼁뼈뼉뼘뼙뼛뼜뼝뽀뽁뽄뽈뽐뽑뽕뾔뾰뿅뿌뿍뿐뿔뿜뿟뿡쀼쁑쁘쁜쁠쁨쁩삐삑삔삘삠삡삣삥사삭삯산삳살삵삶삼삽삿샀상샅새색샌샐샘샙샛샜생샤샥샨샬샴샵샷샹섀섄섈섐섕서석섞섟선섣설섦섧섬섭섯섰성섶세섹센셀셈셉셋셌셍셔셕션셜셤셥셧셨셩셰셴셸솅소속솎손솔솖솜솝솟송솥솨솩솬솰솽쇄쇈쇌쇔쇗쇘쇠쇤쇨쇰쇱쇳쇼쇽숀숄숌숍숏숑수숙순숟술숨숩숫숭숯숱숲숴쉈쉐쉑쉔쉘쉠쉥쉬쉭쉰쉴쉼쉽쉿슁슈슉슐슘슛슝스슥슨슬슭슴습슷승시식신싣실싫심십싯싱싶싸싹싻싼쌀쌈쌉쌌쌍쌎쌓쌔쌕쌘쌜쌤쌥쌨쌩썅써썩썬썰썲썸썹썼썽쎄쎈쎌쏀쏘쏙쏜쏟쏠쏢쏨쏩쏭쏴쏵쏸쐈쐐쐤쐬쐰쐴쐼쐽쑈쑤쑥쑨쑬쑴쑵쑹쒀쒔쒜쒸쒼쓩쓰쓱쓴쓸쓺쓿씀씁씌씐씔씜씨씩씬씰씸씹씻씽아악안앉않알앍앎앓암압앗았앙앝앞애액앤앨앰앱앳앴앵야약얀얄얇얌얍얏양얕얗얘얜얠얩어억언얹얻얼얽얾엄업없엇었엉엊엌엎에엑엔엘엠엡엣엥여역엮연열엶엷염엽엾엿였영옅옆옇예옌옐옘옙옛옜오옥온올옭옮옰옳옴옵옷옹옻와왁완왈왐왑왓왔왕왜왝왠왬왯왱외왹왼욀욈욉욋욍요욕욘욜욤욥욧용우욱운울욹욺움웁웃웅워웍원월웜웝웠웡웨웩웬웰웸웹웽위윅윈윌윔윕윗윙유육윤율윰윱윳융윷으윽은을읊음읍읏응읒읓읔읕읖읗의읜읠읨읫이익인일읽읾잃임입잇있잉잊잎자작잔잖잗잘잚잠잡잣잤장잦재잭잰잴잼잽잿쟀쟁쟈쟉쟌쟎쟐쟘쟝쟤쟨쟬저적전절젊점접젓정젖제젝젠젤젬젭젯젱져젼졀졈졉졌졍졔조족존졸졺좀좁좃종좆좇좋좌좍좔좝좟좡좨좼좽죄죈죌죔죕죗죙죠죡죤죵주죽준줄줅줆줌줍줏중줘줬줴쥐쥑쥔쥘쥠쥡쥣쥬쥰쥴쥼즈즉즌즐즘즙즛증지직진짇질짊짐집짓징짖짙짚짜짝짠짢짤짧짬짭짯짰짱째짹짼쨀쨈쨉쨋쨌쨍쨔쨘쨩쩌쩍쩐쩔쩜쩝쩟쩠쩡쩨쩽쪄쪘쪼쪽쫀쫄쫌쫍쫏쫑쫓쫘쫙쫠쫬쫴쬈쬐쬔쬘쬠쬡쭁쭈쭉쭌쭐쭘쭙쭝쭤쭸쭹쮜쮸쯔쯤쯧쯩찌찍찐찔찜찝찡찢찧차착찬찮찰참찹찻찼창찾채책챈챌챔챕챗챘챙챠챤챦챨챰챵처척천철첨첩첫첬청체첵첸첼쳄쳅쳇쳉쳐쳔쳤쳬쳰촁초촉촌촐촘촙촛총촤촨촬촹최쵠쵤쵬쵭쵯쵱쵸춈추축춘출춤춥춧충춰췄췌췐취췬췰췸췹췻췽츄츈츌츔츙츠측츤츨츰츱츳층치칙친칟칠칡침칩칫칭카칵칸칼캄캅캇캉캐캑캔캘캠캡캣캤캥캬캭컁커컥컨컫컬컴컵컷컸컹케켁켄켈켐켑켓켔켕켜켠켤켬켭켯켰켱켸코콕콘콜콤콥콧콩콰콱콴콸쾀쾅쾌쾡쾨쾰쿄쿠쿡쿤쿨쿰쿱쿳쿵쿼퀀퀄퀑퀘퀭퀴퀵퀸퀼큄큅큇큉큐큔큘큠크큭큰클큼큽킁키킥킨킬킴킵킷킹타탁탄탈탉탐탑탓탔탕태택탠탤탬탭탯탰탱탸턍터턱턴털턺텀텁텃텄텅테텍텐텔템텝텟텡텨텬텼톄톈토톡톤톨톰톱톳통톺톼퇀퇘퇴퇸툇툉툐투툭툰툴툼툽툿퉁퉈퉜퉤튀튁튄튈튐튑튕튜튠튤튬튱트특튼튿틀틂틈틉틋틔틘틜틤틥티틱틴틸팀팁팃팅파팍팎판팔팖팜팝팟팠팡팥패팩팬팰팸팹팻팼팽퍄퍅퍼퍽펀펄펌펍펏펐펑페펙펜펠펨펩펫펭펴편펼폄폅폈평폐폘폡폣포폭폰폴폼폽폿퐁퐈퐝푀푄표푠푤푭푯푸푹푼푿풀풂품풉풋풍풔풩퓌퓐퓔퓜퓟퓨퓬퓰퓸퓻퓽프픈플픔픕픗피픽핀필핌핍핏핑하학한할핥함합핫항해핵핸핼햄햅햇했행햐향허헉헌헐헒험헙헛헝헤헥헨헬헴헵헷헹혀혁현혈혐협혓혔형혜혠혤혭호혹혼홀홅홈홉홋홍홑화확환활홧황홰홱홴횃횅회획횐횔횝횟횡효횬횰횹횻후훅훈훌훑훔훗훙훠훤훨훰훵훼훽휀휄휑휘휙휜휠휨휩휫휭휴휵휸휼흄흇흉흐흑흔흖흗흘흙흠흡흣흥흩희흰흴흼흽힁히힉힌힐힘힙힛힝'
        ];

        this.loadedFonts = new Set();
        this.fontLoadPromises = new Map();
        this.init();
    }

    /**
     * 폰트 최적화 시스템 초기화
     */
    async init() {
        try {
            await this.setupFontDisplay();
            await this.preloadCriticalFonts();
            this.setupFontLoadingStrategy();
            this.setupFontFallbacks();
            this.monitorFontPerformance();
            console.log('FontOptimizer: 초기화 완료');
        } catch (error) {
            console.error('FontOptimizer: 초기화 실패', error);
        }
    }

    /**
     * 폰트 디스플레이 설정
     */
    async setupFontDisplay() {
        // CSS Font Loading API 지원 확인
        if ('fonts' in document) {
            // 폰트 로딩 실패 시 fallback 처리
            const loadFontWithFallback = (fontUrl, fontFamily, fontWeight) => {
                return new Promise((resolve) => {
                    const link = document.createElement('link');
                    link.rel = 'preload';
                    link.as = 'font';
                    link.type = 'font/woff2';
                    link.crossOrigin = 'anonymous';
                    link.href = fontUrl;
                    
                    link.onload = () => resolve(true);
                    link.onerror = () => {
                        console.warn(`Font loading failed for ${fontFamily} ${fontWeight}, using fallback`);
                        resolve(false);
                    };
                    
                    // 타임아웃 설정 (3초)
                    setTimeout(() => {
                        if (!link.onload.called) {
                            console.warn(`Font loading timeout for ${fontFamily} ${fontWeight}`);
                            resolve(false);
                        }
                    }, 3000);
                    
                    document.head.appendChild(link);
                });
            };

            // 안전한 폰트 스타일 적용
            const applyFontStyles = async () => {
                const fontUrl = 'https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.woff2';
                
                // 폰트 로딩 시도
                const fontLoaded = await loadFontWithFallback(fontUrl, 'Noto Sans KR', '400');
                
                const style = document.createElement('style');
                
                if (fontLoaded) {
                    // 폰트 로딩 성공 시 원래 스타일 적용
                    style.textContent = `
                        @font-face {
                            font-family: 'Noto Sans KR';
                            font-style: normal;
                            font-weight: 300;
                            font-display: swap;
                            src: url('${fontUrl}') format('woff2');
                            unicode-range: U+AC00-D7A3, U+1100-11FF, U+3130-318F, U+A960-A97F, U+D7B0-D7FF;
                        }
                        @font-face {
                            font-family: 'Noto Sans KR';
                            font-style: normal;
                            font-weight: 400;
                            font-display: swap;
                            src: url('${fontUrl}') format('woff2');
                            unicode-range: U+AC00-D7A3, U+1100-11FF, U+3130-318F, U+A960-A97F, U+D7B0-D7FF;
                        }
                        @font-face {
                            font-family: 'Noto Sans KR';
                            font-style: normal;
                            font-weight: 500;
                            font-display: swap;
                            src: url('${fontUrl}') format('woff2');
                            unicode-range: U+AC00-D7A3, U+1100-11FF, U+3130-318F, U+A960-A97F, U+D7B0-D7FF;
                        }
                        @font-face {
                            font-family: 'Noto Sans KR';
                            font-style: normal;
                            font-weight: 700;
                            font-display: swap;
                            src: url('${fontUrl}') format('woff2');
                            unicode-range: U+AC00-D7A3, U+1100-11FF, U+3130-318F, U+A960-A97F, U+D7B0-D7FF;
                        }
                    `;
                } else {
                    // 폰트 로딩 실패 시 시스템 폰트만 사용
                    style.textContent = `
                        /* Fallback to system fonts */
                        :root {
                            --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                            --font-heading: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                        }
                    `;
                }
                
                document.head.appendChild(style);
            };

            // 폰트 스타일 적용 실행
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', applyFontStyles);
            } else {
                applyFontStyles();
            }
        }
    }

    /**
     * 중요한 폰트 사전 로딩
     */
    async preloadCriticalFonts() {
        const criticalFonts = Object.entries(this.FONT_CONFIGS)
            .filter(([name, config]) => config.preload);

        for (const [fontName, config] of criticalFonts) {
            await this.preloadFont(fontName, config);
        }
    }

    /**
     * 개별 폰트 사전 로딩
     */
    async preloadFont(fontName, config) {
        try {
            // 가장 중요한 weight만 preload
            const primaryWeight = config.weights[0];
            const fontUrl = this.generateFontUrl(fontName, primaryWeight, config);
            
            // 네트워크 상태 확인
            if (!navigator.onLine) {
                console.log(`FontOptimizer: 오프라인 상태로 ${fontName} ${primaryWeight} 사전 로딩 스킵`);
                return;
            }

            // 개발 환경에서는 실제 폰트 로딩 대신 로그만 출력
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                console.log(`FontOptimizer: [개발 환경] ${fontName} ${primaryWeight} 사전 로딩 시뮬레이션`);
                this.loadedFonts.add(`${fontName}-${primaryWeight}`);
                return;
            }
            
            // preload link 생성
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'font';
            link.type = 'font/woff2';
            link.href = fontUrl;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);

            // Font Loading API로 로딩 확인
            if ('fonts' in document) {
                const fontFace = new FontFace(
                    fontName,
                    `url(${fontUrl})`,
                    {
                        weight: primaryWeight.toString(),
                        display: config.display
                    }
                );

                const loadPromise = fontFace.load().then(() => {
                    document.fonts.add(fontFace);
                    this.loadedFonts.add(`${fontName}-${primaryWeight}`);
                    console.log(`FontOptimizer: ${fontName} ${primaryWeight} 로딩 완료`);
                });

                this.fontLoadPromises.set(`${fontName}-${primaryWeight}`, loadPromise);
                await loadPromise;
            }
        } catch (error) {
            console.warn(`FontOptimizer: ${fontName} 사전 로딩 실패`, error);
        }
    }

    /**
     * 폰트 URL 생성
     */
    generateFontUrl(fontName, weight, config) {
        if (fontName === 'Noto Sans KR') {
            // Google Fonts API를 통한 최적화된 URL
            const subset = config.subsets.join(',');
            return `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&display=${config.display}&subset=${subset}`;
        }
        
        // 다른 폰트들에 대한 URL 생성 로직
        return `https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@${weight}&display=${config.display}`;
    }

    /**
     * 폰트 로딩 전략 설정
     */
    setupFontLoadingStrategy() {
        // Intersection Observer를 사용한 지연 로딩
        this.setupLazyFontLoading();
        
        // 사용자 상호작용 기반 로딩
        this.setupInteractionBasedLoading();
        
        // 네트워크 상태 기반 로딩
        this.setupNetworkAwareLoading();
    }

    /**
     * 지연 폰트 로딩 설정
     */
    setupLazyFontLoading() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const fontFamily = getComputedStyle(element).fontFamily;
                    const fontWeight = getComputedStyle(element).fontWeight;
                    
                    this.loadFontIfNeeded(fontFamily, fontWeight);
                    observer.unobserve(element);
                }
            });
        }, {
            rootMargin: '50px'
        });

        // 텍스트 요소들 관찰
        document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * 상호작용 기반 폰트 로딩
     */
    setupInteractionBasedLoading() {
        const loadSecondaryFonts = () => {
            Object.entries(this.FONT_CONFIGS).forEach(([fontName, config]) => {
                if (!config.preload) {
                    config.weights.forEach(weight => {
                        this.loadFontIfNeeded(fontName, weight);
                    });
                }
            });
        };

        // 첫 번째 사용자 상호작용 시 추가 폰트 로딩
        ['click', 'scroll', 'keydown'].forEach(event => {
            document.addEventListener(event, loadSecondaryFonts, { once: true });
        });
    }

    /**
     * 네트워크 상태 기반 로딩
     */
    setupNetworkAwareLoading() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            // 느린 연결에서는 필수 폰트만 로딩
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                console.log('FontOptimizer: 느린 네트워크 감지, 필수 폰트만 로딩');
                return;
            }
            
            // 빠른 연결에서는 모든 폰트 사전 로딩
            if (connection.effectiveType === '4g') {
                this.preloadAllFonts();
            }
        }
    }

    /**
     * 필요시 폰트 로딩
     */
    async loadFontIfNeeded(fontFamily, fontWeight = '400') {
        const fontKey = `${fontFamily}-${fontWeight}`;
        
        if (this.loadedFonts.has(fontKey)) {
            return;
        }

        if (this.fontLoadPromises.has(fontKey)) {
            return this.fontLoadPromises.get(fontKey);
        }

        const config = this.FONT_CONFIGS[fontFamily];
        if (!config) return;

        const loadPromise = this.loadFont(fontFamily, fontWeight, config);
        this.fontLoadPromises.set(fontKey, loadPromise);
        
        return loadPromise;
    }

    /**
     * 폰트 로딩
     */
    async loadFont(fontFamily, fontWeight, config) {
        try {
            // 개발 환경에서는 실제 폰트 로딩 대신 시뮬레이션
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                console.log(`FontOptimizer: [개발 환경] ${fontFamily} ${fontWeight} 로딩 시뮬레이션`);
                this.loadedFonts.add(`${fontFamily}-${fontWeight}`);
                return;
            }

            if ('fonts' in document) {
                const fontUrl = this.generateFontUrl(fontFamily, fontWeight, config);
                const fontFace = new FontFace(
                    fontFamily,
                    `url(${fontUrl})`,
                    {
                        weight: fontWeight.toString(),
                        display: config.display
                    }
                );

                await fontFace.load();
                document.fonts.add(fontFace);
                this.loadedFonts.add(`${fontFamily}-${fontWeight}`);
                
                console.log(`FontOptimizer: ${fontFamily} ${fontWeight} 동적 로딩 완료`);
            }
        } catch (error) {
            console.warn(`FontOptimizer: ${fontFamily} ${fontWeight} 로딩 실패`, error);
        }
    }

    /**
     * 모든 폰트 사전 로딩
     */
    async preloadAllFonts() {
        const promises = [];
        
        Object.entries(this.FONT_CONFIGS).forEach(([fontName, config]) => {
            config.weights.forEach(weight => {
                promises.push(this.loadFontIfNeeded(fontName, weight));
            });
        });

        await Promise.all(promises);
        console.log('FontOptimizer: 모든 폰트 사전 로딩 완료');
    }

    /**
     * 폰트 폴백 설정
     */
    setupFontFallbacks() {
        const style = document.createElement('style');
        style.textContent = `
            .font-noto-sans-kr {
                font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            }
            
            .font-inter {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            }
            
            /* 폰트 로딩 중 스타일 */
            .font-loading {
                visibility: hidden;
            }
            
            .font-loaded {
                visibility: visible;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 폰트 성능 모니터링
     */
    monitorFontPerformance() {
        if ('fonts' in document) {
            document.fonts.addEventListener('loadingdone', (event) => {
                console.log(`FontOptimizer: ${event.fontfaces.length}개 폰트 로딩 완료`);
                
                // 폰트 로딩 완료 후 레이아웃 시프트 최소화
                document.body.classList.add('fonts-loaded');
            });

            document.fonts.addEventListener('loadingerror', (event) => {
                // 개발 환경에서는 외부 폰트 로딩 실패가 정상적임
                if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                    console.debug('FontOptimizer: 개발 환경에서 폰트 로딩 실패 (정상)', event);
                } else {
                    console.warn('FontOptimizer: 폰트 로딩 오류', event);
                }
            });
        }

        // 폰트 로딩 시간 측정
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name.includes('font')) {
                        console.log(`FontOptimizer: 폰트 로딩 시간 ${entry.name}: ${entry.duration.toFixed(2)}ms`);
                    }
                }
            });

            observer.observe({ entryTypes: ['resource'] });
        }
    }

    /**
     * 폰트 서브셋 생성 (클라이언트 사이드)
     */
    createFontSubset(text) {
        // 텍스트에서 사용된 문자 추출
        const usedChars = new Set(text);
        const koreanChars = [];
        const latinChars = [];

        usedChars.forEach(char => {
            const code = char.charCodeAt(0);
            if ((code >= 0xAC00 && code <= 0xD7A3) || // 한글 완성형
                (code >= 0x1100 && code <= 0x11FF) || // 한글 자모
                (code >= 0x3130 && code <= 0x318F)) { // 한글 호환 자모
                koreanChars.push(char);
            } else if (code <= 0x007F) { // 기본 라틴
                latinChars.push(char);
            }
        });

        return {
            korean: koreanChars.join(''),
            latin: latinChars.join(''),
            total: usedChars.size
        };
    }

    /**
     * 로드된 폰트 목록 반환
     */
    getLoadedFonts() {
        return Array.from(this.loadedFonts);
    }

    /**
     * 폰트 상태 확인
     */
    getFontStatus() {
        const status = {
            loadedFonts: Array.from(this.loadedFonts),
            totalFonts: Object.keys(this.FONT_CONFIGS).length,
            loadingPromises: this.fontLoadPromises.size,
            browserSupport: {
                fontLoading: 'fonts' in document,
                fontDisplay: CSS.supports('font-display', 'swap'),
                fontFace: 'FontFace' in window
            }
        };

        if ('fonts' in document) {
            status.documentFonts = {
                ready: document.fonts.ready,
                status: document.fonts.status,
                size: document.fonts.size
            };
        }

        return status;
    }

    /**
     * 폰트 캐시 정리
     */
    clearFontCache() {
        this.loadedFonts.clear();
        this.fontLoadPromises.clear();
        
        if ('fonts' in document) {
            document.fonts.clear();
        }
        
        console.log('FontOptimizer: 폰트 캐시 정리 완료');
    }

    /**
     * 폰트 최적화 보고서 생성
     */
    generateOptimizationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            loadedFonts: this.loadedFonts.size,
            totalConfiguredFonts: Object.keys(this.FONT_CONFIGS).length,
            preloadedFonts: Object.values(this.FONT_CONFIGS).filter(config => config.preload).length,
            fontLoadingStrategies: [
                'preload',
                'lazy-loading',
                'interaction-based',
                'network-aware'
            ],
            performance: this.getFontStatus(),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * 최적화 권장사항 생성
     */
    generateRecommendations() {
        const recommendations = [];

        if (this.loadedFonts.size === 0) {
            recommendations.push('폰트가 로딩되지 않았습니다. 네트워크 연결을 확인하세요.');
        }

        if (!('fonts' in document)) {
            recommendations.push('Font Loading API를 지원하지 않는 브라우저입니다. 폴백 전략을 강화하세요.');
        }

        const preloadCount = Object.values(this.FONT_CONFIGS).filter(config => config.preload).length;
        if (preloadCount > 2) {
            recommendations.push('너무 많은 폰트를 preload하고 있습니다. 필수 폰트만 preload하세요.');
        }

        return recommendations;
    }
}

// 전역 노출 (즉시 실행)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontOptimizer;
} else {
    // 전역 인스턴스 생성 (강력한 보호)
    let fontOptimizer;
    
    // 더 엄격한 인스턴스 체크
    if (window.FontOptimizer && 
        typeof window.FontOptimizer === 'object' && 
        window.FontOptimizer.constructor && 
        window.FontOptimizer.constructor.name === 'FontOptimizer' &&
        typeof window.FontOptimizer.getFontStatus === 'function') {
        // 기존 인스턴스 사용
        fontOptimizer = window.FontOptimizer;
        console.log('=== 기존 FontOptimizer 인스턴스 재사용 ===');
    } else {
        // 새 인스턴스 생성
        fontOptimizer = new FontOptimizer();
        console.log('=== 새 FontOptimizer 인스턴스 생성 ===');
        
        // 인스턴스를 전역에 노출 (클래스는 별도 보관)
        window.FontOptimizer = fontOptimizer;
        window.FontOptimizerClass = FontOptimizer;
        window.fontOptimizer = fontOptimizer;
        
        // 즉시 초기화 시도 (비동기)
        (async () => {
            try {
                await fontOptimizer.init();
                console.log('FontOptimizer 즉시 초기화 완료');
            } catch (error) {
                console.warn('FontOptimizer 즉시 초기화 실패:', error);
                // DOM 로드 완료 후 초기화
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', async () => {
                        await fontOptimizer.init();
                    });
                } else {
                    setTimeout(async () => await fontOptimizer.init(), 100);
                }
            }
        })();
    }
    
    console.log('=== FontOptimizer 전역 노출 완료 ===');
    console.log('window.FontOptimizer 타입:', typeof window.FontOptimizer);
    console.log('window.FontOptimizer.getLoadedFonts 타입:', typeof window.FontOptimizer.getLoadedFonts);
    console.log('window.FontOptimizer 생성자:', window.FontOptimizer.constructor.name);
    console.log('인스턴스 확인:', window.FontOptimizer instanceof FontOptimizer);
    
    // 개발자 도구용 유틸리티
    window.getFontStatus = () => fontOptimizer.getFontStatus();
    window.getFontReport = () => fontOptimizer.generateOptimizationReport();
    window.clearFontCache = () => fontOptimizer.clearFontCache();
    
    // 즉시 초기화 시도 (비동기)
    (async () => {
        try {
            await fontOptimizer.init();
            console.log('FontOptimizer 즉시 초기화 완료');
        } catch (error) {
            console.warn('FontOptimizer 즉시 초기화 실패:', error);
            // DOM 로드 완료 후 초기화
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', async () => {
                    await fontOptimizer.init();
                });
            } else {
                setTimeout(async () => await fontOptimizer.init(), 100);
            }
        }
    })();
}